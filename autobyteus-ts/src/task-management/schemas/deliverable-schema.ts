import { z } from 'zod';

export const FileDeliverableSchema = z.object({
  file_path: z.string().describe('The relative path to the file being submitted.'),
  summary: z
    .string()
    .describe('A summary of the work done on this file, explaining what is new or what was updated.')
});

export type FileDeliverable = z.infer<typeof FileDeliverableSchema>;
