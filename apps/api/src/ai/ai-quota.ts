import { PrismaClient } from '@prisma/client';

/**
 * The daily cap (AI_MAX_CALLS_PER_PROJECT_PER_DAY) counts every call the project made
 * to the model today: step reviews and description drafts share one budget.
 */
export async function callsToday(prisma: Pick<PrismaClient, 'aiReview' | 'aiDraft'>, projectId: string): Promise<number> {
  const since = startOfTodayUtc();
  const [reviews, drafts] = await Promise.all([
    prisma.aiReview.count({ where: { projectId, createdAt: { gte: since } } }),
    prisma.aiDraft.count({ where: { projectId, createdAt: { gte: since } } }),
  ]);
  return reviews + drafts;
}

export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
