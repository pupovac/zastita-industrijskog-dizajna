import { Injectable } from '@nestjs/common';
import { ActorType, ReviewIssue } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { assertMockAllowed } from '../domain/mock-data';
import { assertFindingUpdateAllowed, planFindingStatusChange, SEVERITY_RANK } from '../domain/review-rules';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateFindingDto, FindingStatusDto, UpdateFindingDto } from './review.dto';

const include = { fileA: true, fileB: true, chosenFile: true } as const;

/** Findings of the independent review (step 11), risks and document conflicts. */
@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  /** Open items first, most severe first. */
  async list(projectId: string) {
    await this.projects.assertExists(projectId);
    const issues = await this.prisma.reviewIssue.findMany({ where: { projectId }, include, orderBy: { createdAt: 'asc' } });
    return issues.sort(
      (a, b) =>
        Number(a.status !== 'OPEN') - Number(b.status !== 'OPEN') ||
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async create(projectId: string, dto: CreateFindingDto, actor: ActorType) {
    assertMockAllowed(await this.projects.get(projectId), dto.sourceReference);
    return this.prisma.reviewIssue.create({ data: { ...dto, projectId, createdByActor: actor }, include });
  }

  async update(issueId: string, dto: UpdateFindingDto, actor: ActorType) {
    const issue = await this.get(issueId);
    assertFindingUpdateAllowed(issue, dto, actor);
    return this.prisma.reviewIssue.update({ where: { id: issueId }, data: dto, include });
  }

  async changeStatus(issueId: string, dto: FindingStatusDto, actor: ActorType) {
    const issue = await this.get(issueId);
    const next = planFindingStatusChange(issue, { actor, to: dto.status, note: dto.note, now: new Date() });
    const updated = await this.prisma.reviewIssue.updateMany({
      where: { id: issueId, status: issue.status },
      data: next,
    });
    if (updated.count !== 1) {
      throw new DomainError('FINDING_CHANGED', 'Nalaz je u međuvremenu izmenjen. Pregledajte ga ponovo.', 'CONFLICT');
    }
    if (dto.status === 'DISMISSED') {
      // Accepting a finding without fixing it is a decision the user owns.
      await this.prisma.decision.create({
        data: {
          projectId: issue.projectId,
          stepKey: issue.stepKey,
          title: `Nalaz prihvaćen bez ispravke: ${issue.title}`,
          rationale: next.resolutionNote ?? '',
          decidedBy: 'USER',
          sourceType: 'USER',
          reviewIssueId: issue.id,
        },
      });
    }
    return this.prisma.reviewIssue.findUniqueOrThrow({ where: { id: issueId }, include });
  }

  private async get(issueId: string): Promise<ReviewIssue> {
    return orNotFound(await this.prisma.reviewIssue.findUnique({ where: { id: issueId } }), 'Nalaz');
  }
}
