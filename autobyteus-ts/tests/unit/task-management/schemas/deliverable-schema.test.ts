import { describe, it, expect } from 'vitest';
import { FileDeliverableSchema } from '../../../../src/task-management/schemas/deliverable-schema.js';

describe('FileDeliverableSchema', () => {
  it('requires file_path and summary', () => {
    const result = FileDeliverableSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('file_path'))).toBe(true);
      expect(result.error.issues.some((issue) => issue.path.includes('summary'))).toBe(true);
    }
  });

  it('accepts valid deliverable data', () => {
    const result = FileDeliverableSchema.safeParse({
      file_path: 'src/app.ts',
      summary: 'Implemented new parser.'
    });

    expect(result.success).toBe(true);
  });
});
