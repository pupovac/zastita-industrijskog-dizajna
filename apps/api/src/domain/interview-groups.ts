/** Interview groups A–G (§4). Questions are shown one small group at a time. */
export const INTERVIEW_GROUPS = [
  { key: 'A', title: 'Podnosilac prijave', highPriority: false },
  { key: 'B', title: 'Autor / dizajner', highPriority: false },
  { key: 'C', title: 'Proizvod', highPriority: false },
  { key: 'D', title: 'Vizuelne karakteristike', highPriority: false },
  { key: 'E', title: 'Profil za spajanje panela', highPriority: false },
  { key: 'F', title: 'Varijante proizvoda', highPriority: false },
  { key: 'G', title: 'Prethodno javno objavljivanje', highPriority: true },
] as const;

export type InterviewGroupKey = (typeof INTERVIEW_GROUPS)[number]['key'];

export const INTERVIEW_GROUP_KEYS = INTERVIEW_GROUPS.map((g) => g.key) as [InterviewGroupKey, ...InterviewGroupKey[]];

/** Questions written as "A1 — …" / "G12 – …" belong to that group. */
export function inferInterviewGroup(text: string): InterviewGroupKey | null {
  const match = /^([A-G])\d{1,2}\s*[—–-]/.exec(text.trim());
  return match ? (match[1] as InterviewGroupKey) : null;
}
