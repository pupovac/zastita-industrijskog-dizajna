import { FileRole } from '@prisma/client';
import { z } from 'zod';

export const uploadFileSchema = z.object({ role: z.nativeEnum(FileRole).default('OTHER') });
export type UploadFileDto = z.infer<typeof uploadFileSchema>;

export const updateFileSchema = z.object({ role: z.nativeEnum(FileRole) }).strict();
export type UpdateFileDto = z.infer<typeof updateFileSchema>;

export const createConflictSchema = z.object({
  fileAId: z.string().uuid(),
  fileBId: z.string().uuid(),
  attribute: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).default(''),
});
export type CreateConflictDto = z.infer<typeof createConflictSchema>;

export const resolveConflictSchema = z.object({
  chosenFileId: z.string().uuid(),
  note: z.string().trim().max(4000).optional(),
});
export type ResolveConflictDto = z.infer<typeof resolveConflictSchema>;
