import { describe, expect, it } from 'vitest';
import { GetRunFileChanges, ListWorkspaceRunHistory } from '../runHistoryQueries';

describe('GetRunFileChanges query', () => {
  it('requests inline content for live buffered file-change hydration without legacy artifact ids', () => {
    const source = GetRunFileChanges.loc?.source.body ?? '';

    expect(source).toContain('getRunFileChanges');
    expect(source).toContain('content');
    expect(source).not.toContain('backendArtifactId');
  });
});

describe('ListWorkspaceRunHistory query', () => {
  it('uses the V2 standalone history shape while retaining team history fields', () => {
    const source = ListWorkspaceRunHistory.loc?.source.body ?? '';
    const standaloneRunsBlock = source.match(/agentDefinitions[\s\S]*?runs[\s\S]*?}\s*}\s*teamDefinitions/)?.[0] ?? '';
    const teamRunsBlock = source.match(/teamDefinitions[\s\S]*?runs[\s\S]*?members/)?.[0] ?? '';

    expect(standaloneRunsBlock).toContain('createdAt');
    expect(standaloneRunsBlock).toContain('archivedAt');
    expect(standaloneRunsBlock).toContain('terminatedAt');
    expect(standaloneRunsBlock).toContain('status');
    expect(standaloneRunsBlock).not.toContain('lastActivityAt');
    expect(standaloneRunsBlock).not.toContain('lastKnownStatus');

    expect(teamRunsBlock).toContain('lastActivityAt');
    expect(teamRunsBlock).toContain('lastKnownStatus');
    expect(teamRunsBlock).toContain('deleteLifecycle');
  });
});
