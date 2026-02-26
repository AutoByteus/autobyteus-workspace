import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Environment Setup', () => {
  it('should support typescript and vitest', () => {
    expect(true).toBe(true);
  });

  it('should support zod validation', () => {
    const schema = z.object({
      name: z.string(),
    });
    const result = schema.safeParse({ name: 'autobyteus' });
    expect(result.success).toBe(true);
  });
});
