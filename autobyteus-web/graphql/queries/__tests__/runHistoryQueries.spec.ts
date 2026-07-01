import { describe, expect, it } from 'vitest';
import { GetRunFileChanges, GetTeamCommunicationMessages, ListWorkspaceRunHistory } from '../runHistoryQueries';

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
    expect(standaloneRunsBlock).not.toContain('lastActivityAt');
    expect(standaloneRunsBlock).not.toContain('lastKnownStatus');

    expect(teamRunsBlock).toContain('createdAt');
    expect(teamRunsBlock).toContain('archivedAt');
    expect(teamRunsBlock).toContain('terminatedAt');
    expect(teamRunsBlock).toContain('status');
    expect(teamRunsBlock).not.toContain('lastActivityAt');
    expect(teamRunsBlock).not.toContain('lastKnownStatus');
    expect(teamRunsBlock).not.toContain('deleteLifecycle');
  });
});

describe('GetTeamCommunicationMessages query', () => {
  it('requests address-first sender and receiver fields without removed flat participant identity', () => {
    const source = GetTeamCommunicationMessages.loc?.source.body ?? '';

    expect(source).toContain('getTeamCommunicationMessages');
    expect(source).toContain('senderAddress');
    expect(source).toContain('receiverAddress');
    expect(source).toContain('segments');
    expect(source).toContain('memberRouteKey');
    expect(source).toContain('taskTeamRunId');
    expect(source).toContain('taskAgentRunId');
    expect(source).not.toContain('senderRunId');
    expect(source).not.toContain('receiverRunId');
    expect(source).not.toContain('senderMemberRouteKey');
    expect(source).not.toContain('receiverMemberRouteKey');
    expect(source).not.toContain('taskTeamScope');
  });
});
