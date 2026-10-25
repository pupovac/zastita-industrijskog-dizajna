import { Injectable } from '@nestjs/common';
import { ActorType, Question } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { planDefaultQuestionRefresh } from '../domain/default-question-refresh';
import { DomainError } from '../domain/domain-error';
import { isDeferredToFiling } from '../domain/filing-deferral';
import { inferInterviewGroup } from '../domain/interview-groups';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_QUESTION_BANK_VERSION, DEFAULT_QUESTIONS } from '../projects/default-questions';
import { ProjectsService } from '../projects/projects.service';
import { CreateQuestionDto, SaveAnswerDto, UpdateQuestionDto } from './questions.dto';

export type QuestionView = Omit<Question, 'includeHintsJson' | 'avoidHintsJson'> & {
  includeHints: string[];
  avoidHints: string[];
};

function parseHints(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** API shape: hint lists as arrays instead of JSON text columns. */
export function questionView<T extends Question>(question: T): Omit<T, 'includeHintsJson' | 'avoidHintsJson'> & QuestionView {
  const { includeHintsJson, avoidHintsJson, ...rest } = question;
  return { ...rest, includeHints: parseHints(includeHintsJson), avoidHints: parseHints(avoidHintsJson) };
}

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
      orderBy: [{ stepKey: 'asc' }, { interviewGroup: 'asc' }, { position: 'asc' }],
      include: { answers: { where: { projectId }, include: { attachment: true } } },
    });
    return questions.map(({ answers, ...q }) => ({ ...questionView(q), answer: answers[0] ?? null }));
  }

  async create(projectId: string, dto: CreateQuestionDto, actor: ActorType) {
    await this.projects.assertExists(projectId);
    const last = await this.prisma.question.findFirst({
      where: { projectId, stepKey: dto.stepKey },
      orderBy: { position: 'desc' },
    });
    const { includeHints, avoidHints, ...rest } = dto;
    const created = await this.prisma.question.create({
      data: {
        ...rest,
        includeHintsJson: JSON.stringify(includeHints),
        avoidHintsJson: JSON.stringify(avoidHints),
        interviewGroup: dto.interviewGroup ?? inferInterviewGroup(dto.text),
        deferredToFiling: isDeferredToFiling(dto),
        projectId,
        position: (last?.position ?? 0) + 1,
        createdByActor: actor,
      },
    });
    return questionView(created);
  }

  /**
   * "Osveži pitanja i primere": updates the guidance of this project's default questions
   * to the current bank and adds bank questions the project lacks. Answers are never
   * touched (the plan has no answer operations at all); only the user may run it.
   */
  async refreshDefaults(projectId: string, actor: ActorType) {
    if (actor !== 'USER') {
      throw new DomainError('REFRESH_REQUIRES_USER', 'Pitanja i primere može osvežiti samo korisnik.', 'FORBIDDEN');
    }
    await this.projects.assertExists(projectId);
    const existing = await this.prisma.question.findMany({ where: { projectId } });
    const plan = planDefaultQuestionRefresh(existing, DEFAULT_QUESTIONS);
    await this.prisma.$transaction(async (db) => {
      for (const update of plan.updates) {
        await db.question.update({ where: { id: update.id }, data: update.data });
      }
      for (const addition of plan.additions) {
        await db.question.create({
          data: { ...addition.data, projectId, position: addition.position, createdByActor: 'SYSTEM' },
        });
      }
    });
    return {
      bankVersion: DEFAULT_QUESTION_BANK_VERSION,
      updated: plan.updates.length,
      added: plan.additions.length,
      unchanged: plan.unchanged.length,
    };
  }

  /** Marks a question as needed only for filing (or brings it back into drafting) and sets its interview group. */
  async update(projectId: string, questionId: string, dto: UpdateQuestionDto) {
    const question = orNotFound(
      await this.prisma.question.findFirst({ where: { id: questionId, projectId } }),
      'Pitanje',
    );
    if (
      dto.deferredToFiling === false &&
      isDeferredToFiling({ stepKey: question.stepKey, deferredToFiling: false })
    ) {
      throw new DomainError(
        'FILING_STEP_QUESTION_ALWAYS_DEFERRED',
        'Pitanje iz faze podnošenja ne može da se vrati u izradu dokumenta.',
        'CONFLICT',
      );
    }
    return questionView(await this.prisma.question.update({ where: { id: question.id }, data: dto }));
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
