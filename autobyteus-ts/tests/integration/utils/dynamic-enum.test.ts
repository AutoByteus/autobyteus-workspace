import { describe, it, expect } from 'vitest';
import { DynamicEnum } from '../../../src/utils/dynamic-enum.js';

class Priority extends DynamicEnum {}

describe('DynamicEnum (integration)', () => {
  it('supports toString and lookup for new enum class', () => {
    const high = Priority.add('HIGH', 10);
    expect(high.toString()).toBe('Priority.HIGH');
    const fetched = Priority.getByValue(10);
    expect(fetched).toBe(high);
  });
});
