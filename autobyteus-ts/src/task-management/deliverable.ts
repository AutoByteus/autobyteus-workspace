import { z } from 'zod';

export const FileDeliverableModelSchema = z.object({
  file_path: z.string(),
  summary: z.string(),
  author_agent_name: z.string(),
  timestamp: z.date().default(() => new Date())
});

export type FileDeliverable = z.infer<typeof FileDeliverableModelSchema>;

export function createFileDeliverable(data: Partial<FileDeliverable> & {
  file_path: string;
  summary: string;
  author_agent_name: string;
}): FileDeliverable {
  return FileDeliverableModelSchema.parse(data);
}
