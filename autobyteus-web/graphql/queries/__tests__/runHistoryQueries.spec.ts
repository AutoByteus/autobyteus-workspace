import { describe, expect, it } from 'vitest';
import {
  GetRunEventMonitorActiveTracePage,
  GetRunFileChanges,
  GetTeamMemberEventMonitorActiveTracePage,
  ListWorkspaceRunHistory,
} from '../runHistoryQueries';

describe('Event Monitor active-trace page queries', () => {
  it('exposes only explicit standalone/team subject identity and an opaque cursor', () => {
    const runSource = GetRunEventMonitorActiveTracePage.loc?.source.body ?? '';
    const teamSource = GetTeamMemberEventMonitorActiveTracePage.loc?.source.body ?? '';
    expect(runSource).toContain('$runId: String!');
    expect(teamSource).toContain('$teamRunId: String!');
    expect(teamSource).toContain('$agentRunId: String!');
    expect(teamSource).not.toContain('memberRouteKey');
    for (const source of [runSource, teamSource]) {
      expect(source).toContain('$beforeCursor: String');
      expect(source).not.toMatch(/\$(?:limit|rawTrace|archive|fileName)\b/i);
    }
  });
});

describe('GetRunFileChanges query', () => {
  it('requests inline content for live buffered file-change hydration without legacy artifact ids', () => {
    const source = GetRunFileChanges.loc?.source.body ?? '';

    expect(source).toContain('getRunFileChanges');
    expect(source).toContain('content');
    expect(source).not.toContain('backendArtifactId');
  });
});

describe('ListWorkspaceRunHistory query', () => {
  it('uses V2 standalone and team history catalog shapes without persisted live fields', () => {
    const source = ListWorkspaceRunHistory.loc?.source.body ?? '';
    const standaloneRunsBlock = source.match(/agentDefinitions[\s\S]*?runs[\s\S]*?}\s*}\s*teamDefinitions/)?.[0] ?? '';
    const teamRunsBlock = source.match(/teamDefinitions[\s\S]*?runs[\s\S]*?members/)?.[0] ?? '';

    expect(standaloneRunsBlock).toContain('createdAt');
    expect(standaloneRunsBlock).toContain('archivedAt');
    expect(standaloneRunsBlock).toContain('terminatedAt');
    expect(standaloneRunsBlock).toContain('status');
    // The server's last activity, derived at read time from memory files, never stored (workspace-tree-vs-chooser DS-005).
    expect(standaloneRunsBlock).toContain('lastActivityAt');
    expect(standaloneRunsBlock).not.toContain('lastKnownStatus');

    expect(teamRunsBlock).toContain('createdAt');
    expect(teamRunsBlock).toContain('archivedAt');
    expect(teamRunsBlock).toContain('terminatedAt');
    expect(teamRunsBlock).toContain('isActive');
    expect(teamRunsBlock).toContain('rootTeam');
    expect(teamRunsBlock).toContain('lastActivityAt');
    expect(teamRunsBlock).not.toContain('lastKnownStatus');
    expect(teamRunsBlock).not.toContain('deleteLifecycle');
  });
});
