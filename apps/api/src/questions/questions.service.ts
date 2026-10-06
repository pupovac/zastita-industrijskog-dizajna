import { Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { isDeferredToFiling } from '../domain/filing-deferral';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateQuestionDto, SaveAnswerDto, UpdateQuestionDto } from './questions.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(projectId: string, stepKey?: string) {
    await this.projects.assertExists(projectId);
    const questions = await this.prisma.question.findMany({
      where: { projectId, ...(stepKey ? { stepKey } : {}) },
      orderBy: [{ stepKey: 'asc' }, { position: 'asc' }],
      include: { answers: { where: { projectId }, include: { attachment: true } } },
    });
    return questions.map(({ answers, ...q }) => ({ ...q, answer: answers[0] ?? null }));
  }

  async create(projectId: string, dto: CreateQuestionDto, actor: ActorType) {
    await this.projects.assertExists(projectId);
    const last = await this.prisma.question.findFirst({
      where: { projectId, stepKey: dto.stepKey },
      orderBy: { position: 'desc' },
    });
    return this.prisma.question.create({
      data: {
        ...dto,
        deferredToFiling: isDeferredToFiling(dto),
        projectId,
        position: (last?.position ?? 0) + 1,
        createdByActor: actor,
      },
    });
  }

  /** Marks a question as needed only for filing, or brings it back into drafting. */
  async update(projectId: string, questionId: string, dto: UpdateQuestionDto) {
    const question = orNotFound(
      await this.prisma.question.findFirst({ where: { id: questionId, projectId } }),
      'Pitanje',
    );
    if (!dto.deferredToFiling && isDeferredToFiling({ stepKey: question.stepKey, deferredToFiling: false })) {
      throw new DomainError(
        'FILING_STEP_QUESTION_ALWAYS_DEFERRED',
        'Pitanje iz faze podnošenja ne može da se vrati u izradu dokumenta.',
        'CONFLICT',
      );
    }
    return this.prisma.question.update({ where: { id: question.id }, data: dto });
  }

  /** Autosave: called on every change, persisted immediately. Only the user answers. */
  async saveAnswer(projectId: string, questionId: string, dto: SaveAnswerDto, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('ANSWER_REQUIRES_USER', 'Odgovor na pitanje može upisati samo korisnik.', 'FORBIDDEN');
    }
    const question = orNotFound(
      await this.prisma.question.findFirst({ where: { id: questionId, projectId } }),
      'Pitanje',
    );
    if (dto.attachmentFileId) {
      orNotFound(
        await this.prisma.uploadedFile.findFirst({ where: { id: dto.attachmentFileId, projectId } }),
        'Prilog',
      );
    }
    return this.prisma.userAnswer.upsert({
      where: { projectId_questionId: { projectId, questionId: question.id } },
      create: { projectId, questionId: question.id, value: dto.value, attachmentFileId: dto.attachmentFileId ?? null },
      update: {
        value: dto.value,
        ...(dto.attachmentFileId !== undefined ? { attachmentFileId: dto.attachmentFileId } : {}),
      },
      include: { attachment: true },
    });
  }
}
