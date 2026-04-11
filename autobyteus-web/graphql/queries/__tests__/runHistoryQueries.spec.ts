import { describe, expect, it } from 'vitest';
import { GetRunFileChanges } from '../runHistoryQueries';

describe('GetRunFileChanges query', () => {
  it('requests inline content for live buffered file-change hydration without legacy artifact ids', () => {
    const source = GetRunFileChanges.loc?.source.body ?? '';

    expect(source).toContain('getRunFileChanges');
    expect(source).toContain('content');
    expect(source).not.toContain('backendArtifactId');
  });
});
