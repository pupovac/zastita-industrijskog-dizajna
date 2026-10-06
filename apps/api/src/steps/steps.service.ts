import { Injectable } from '@nestjs/common';
import { ActorType } from '@prisma/client';
import { DomainError } from '../domain/domain-error';
import { gatingStepKey } from '../domain/filing-deferral';
import { planStepTransition, STEP_GATED_BY_BLOCKERS } from '../domain/step-status';
import { isStepKey, StepKey, stepPhase, stepTitle } from '../domain/steps';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { TransitionStepDto } from './steps.dto';

@Injectable()
export class StepsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(projectId: string) {
    await this.projects.assertExists(projectId);
    const steps = await this.prisma.projectStep.findMany({ where: { projectId }, orderBy: { position: 'asc' } });
    const blocking = await this.blockingItemsByStep(projectId);
    const openBlockerFindings = await this.openBlockerFindings(projectId);
    return steps.map((s) => ({
      ...s,
      title: isStepKey(s.stepKey) ? stepTitle(s.stepKey) : s.stepKey,
      phase: isStepKey(s.stepKey) ? stepPhase(s.stepKey) : 'DRAFTING',
      openBlockingItems: blocking.get(s.stepKey) ?? 0,
      blockedByBlockerFindings: s.stepKey === STEP_GATED_BY_BLOCKERS ? openBlockerFindings : 0,
    }));
  }

  async history(projectId: string, stepKey: string) {
    const step = await this.prisma.projectStep.findUnique({ where: { projectId_stepKey: { projectId, stepKey } } });
    if (!step) throw new DomainError('STEP_NOT_FOUND', 'Korak ne postoji u ovom projektu.', 'NOT_FOUND');
    return this.prisma.stepStatusEvent.findMany({ where: { projectStepId: step.id }, orderBy: { createdAt: 'desc' } });
  }

  async transition(projectId: string, stepKey: string, dto: TransitionStepDto, actor: ActorType) {
    if (!isStepKey(stepKey)) throw new DomainError('STEP_NOT_FOUND', 'Nepoznat korak.', 'NOT_FOUND');
    await this.projects.assertExists(projectId);

    await this.prisma.$transaction(async (tx) => {
      const steps = await tx.projectStep.findMany({ where: { projectId } });
      const blocking = await this.blockingItemsByStep(projectId, tx);
      const changes = planStepTransition({
        steps: steps.filter((s) => isStepKey(s.stepKey)).map((s) => ({ ...s, stepKey: s.stepKey as StepKey })),
        stepKey,
        to: dto.to,
        actor,
        reason: dto.reason,
        openBlockingItems: blocking.get(stepKey) ?? 0,
        openBlockerFindings: await this.openBlockerFindings(projectId, tx),
      });
      for (const change of changes) {
        const step = steps.find((s) => s.stepKey === change.stepKey)!;
        await tx.projectStep.update({
          where: { id: step.id },
          data: { status: change.to, blockedReason: change.to === 'BLOCKED' ? change.reason : null },
        });
        await tx.stepStatusEvent.create({
          data: {
            projectStepId: step.id,
            fromStatus: change.from,
            toStatus: change.to,
            actorType: change.stepKey === stepKey ? actor : 'SYSTEM',
            reason: change.reason,
          },
        });
      }
    });

    return this.list(projectId);
  }

  /** Unresolved BLOCKER findings anywhere in the project; they hold up the final package. */
  private openBlockerFindings(projectId: string, db: Pick<PrismaService, 'reviewIssue'> = this.prisma) {
    return db.reviewIssue.count({ where: { projectId, status: 'OPEN', severity: 'BLOCKER' } });
  }

  /**
   * Open blocking questions and open conflicts, grouped by step. Questions deferred
   * to filing are counted against the first filing step, never a drafting step.
   */
  private async blockingItemsByStep(
    projectId: string,
    db: Pick<PrismaService, 'openQuestion' | 'reviewIssue'> = this.prisma,
  ): Promise<Map<string, number>> {
    const [questions, conflicts] = await Promise.all([
      db.openQuestion.groupBy({
        by: ['stepKey', 'deferredToFiling'],
        where: { projectId, status: 'OPEN', blocking: true },
        _count: { _all: true },
      }),
      db.reviewIssue.groupBy({
        by: ['stepKey'],
        where: { projectId, status: 'OPEN', OR: [{ type: 'CONFLICT' }, { severity: 'BLOCKER' }] },
        _count: { _all: true },
      }),
    ]);
    const counts = new Map<string, number>();
    const rows = [
      ...questions.map((row) => ({ stepKey: gatingStepKey(row), count: row._count._all })),
      ...conflicts.map((row) => ({ stepKey: row.stepKey, count: row._count._all })),
    ];
    for (const { stepKey, count } of rows) {
      if (!stepKey) continue;
      counts.set(stepKey, (counts.get(stepKey) ?? 0) + count);
    }
    return counts;
  }
}
