import { describe, expect, it } from 'vitest';
import { GetRunFileChanges } from '../runHistoryQueries';

describe('GetRunFileChanges query', () => {
  it('requests inline content for live buffered file-change hydration', () => {
    const source = GetRunFileChanges.loc?.source.body ?? '';

    expect(source).toContain('getRunFileChanges');
    expect(source).toContain('content');
  });
});
