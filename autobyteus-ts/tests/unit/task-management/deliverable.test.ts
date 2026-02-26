import { describe, it, expect } from 'vitest';
import { createFileDeliverable, FileDeliverableModelSchema } from '../../../src/task-management/deliverable.js';

describe('FileDeliverable', () => {
  it('requires file_path, summary, and author_agent_name', () => {
    const result = FileDeliverableModelSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('defaults timestamp when not provided', () => {
    const deliverable = createFileDeliverable({
      file_path: 'src/main.ts',
      summary: 'Added feature',
      author_agent_name: 'AgentA'
    });

    expect(deliverable.timestamp).toBeInstanceOf(Date);
  });
});
