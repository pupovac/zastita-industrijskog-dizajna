import { z } from 'zod';
import { STEP_KEYS } from '../domain/steps';

const text = (max: number) => z.string().trim().max(max);

export const createProjectSchema = z.object({
  name: text(200).min(1, 'Naziv projekta je obavezan.'),
  productName: text(200).optional(),
});
export type CreateProjectDto = z.infer<typeof createProjectSchema>;

/** Partial update used for autosave: every field is optional and saved immediately. */
export const updateProjectSchema = z
  .object({
    name: text(200).min(1),
    productName: text(200),
    productSummary: text(4000),
    applicantName: text(300),
    applicantAddress: text(500),
    designerName: text(300),
    representativeName: text(300),
    currentStepKey: z.enum(STEP_KEYS as [string, ...string[]]),
    /** „Ciljna dužina opisa" (strane) for the AI draft; null = server default. */
    targetDescriptionPages: z.number().int().min(1).max(30).nullable(),
  })
  .partial();
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
