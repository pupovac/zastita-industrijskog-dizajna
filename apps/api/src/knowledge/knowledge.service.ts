import { Injectable } from '@nestjs/common';
import { isConfirmedUserFact } from '../domain/fact-rules';
import { computeMissingInfo } from '../domain/missing-info';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

/**
 * The "Znanje o projektu" panel: one read model over the persistent project memory.
 * Every agent and the UI read the same context from here, never from chat history.
 */
@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async get(projectId: string) {
    const project = await this.projects.get(projectId);
    const where = { projectId };
    const [facts, features, files, requirements, priorDesigns, decisions, openQuestions, reviewIssues, sections, questions] =
      await Promise.all([
        this.prisma.fact.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.designFeature.findMany({ where, orderBy: { createdAt: 'asc' }, include: { variant: true } }),
        this.prisma.uploadedFile.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          omit: { extractedText: true },
        }),
        this.prisma.sourceRequirement.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          include: { sourceDocument: { include: { source: true } } },
        }),
        this.prisma.priorDesign.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.decision.findMany({ where, orderBy: { createdAt: 'desc' } }),
        this.prisma.openQuestion.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] }),
        this.prisma.reviewIssue.findMany({ where, orderBy: { createdAt: 'desc' } }),
        this.prisma.applicationSection.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
        }),
        this.prisma.question.findMany({ where, include: { answers: { where } } }),
      ]);

    const factViews = facts.map((f) => ({ ...f, confirmedUserFact: isConfirmedUserFact(f) }));
    const byCategory = (category: string) => factViews.filter((f) => f.category === category);

    return {
      project,
      sections: {
        productFacts: byCategory('PRODUCT'),
        visualFeatures: { features, facts: byCategory('VISUAL') },
        applicant: {
          name: project.applicantName,
          address: project.applicantAddress,
          representative: project.representativeName,
          facts: byCategory('APPLICANT'),
        },
        designer: { name: project.designerName, facts: byCategory('DESIGNER') },
        documents: files,
        zisRules: requirements,
        priorDesigns,
        decisions,
        openQuestions,
        risks: reviewIssues.filter((i) => i.type === 'RISK' || i.type === 'CONFLICT'),
        applicationFields: {
          sections: sections.map(({ versions, ...s }) => ({ ...s, latestVersion: versions[0] ?? null })),
          facts: byCategory('APPLICATION_FIELD'),
        },
        otherFacts: byCategory('OTHER'),
      },
      missingInfo: computeMissingInfo({
        project,
        questions: questions.map((q) => ({ ...q, answerValue: q.answers[0]?.value ?? null })),
        facts,
        openQuestions,
        reviewIssues,
        files,
      }),
    };
  }
}
