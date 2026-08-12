import { describe, expect, it } from 'vitest';
import {
  GetRunEventMonitorActiveTracePage,
  GetRunFileChanges,
  GetTaskDelegationRecords,
  GetTeamCommunicationMessages,
  GetTeamMemberEventMonitorActiveTracePage,
  ListWorkspaceRunHistory,
} from '../runHistoryQueries';

describe('Event Monitor active-trace page queries', () => {
  it('exposes only explicit standalone/team subject identity and an opaque cursor', () => {
    const runSource = GetRunEventMonitorActiveTracePage.loc?.source.body ?? '';
    const teamSource = GetTeamMemberEventMonitorActiveTracePage.loc?.source.body ?? '';
    expect(runSource).toContain('$runId: String!');
    expect(teamSource).toContain('$teamRunId: String!');
    expect(teamSource).toContain('$memberAddress: String!');
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
    expect(standaloneRunsBlock).not.toContain('lastActivityAt');
    expect(standaloneRunsBlock).not.toContain('lastKnownStatus');

    expect(teamRunsBlock).toContain('createdAt');
    expect(teamRunsBlock).toContain('archivedAt');
    expect(teamRunsBlock).toContain('terminatedAt');
    expect(teamRunsBlock).toContain('isActive');
    expect(teamRunsBlock).toContain('rootTeam');
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
    expect(source).toContain('rootTeamRunId');
    expect(source).toContain('taskTeamRunIds');
    expect(source).toContain('memberAddress');
    expect(source).toContain('taskAgentRunId');
    expect(source).not.toContain('senderRunId');
    expect(source).not.toContain('receiverRunId');
    expect(source).not.toContain('senderMemberRouteKey');
    expect(source).not.toContain('receiverMemberRouteKey');
    expect(source).not.toContain('taskTeamScope');
    expect(source).not.toContain('memberRouteKey');
  });
});

describe('GetTaskDelegationRecords query', () => {
  it('requests durable address-first task records with updates and references', () => {
    const source = GetTaskDelegationRecords.loc?.source.body ?? '';

    expect(source).toContain('getTaskDelegationRecords');
    expect(source).toContain('taskId');
    expect(source).toContain('status');
    expect(source).toContain('senderAddress');
    expect(source).toContain('receiverAddress');
    expect(source).toContain('receiverTargetKind');
    expect(source).toContain('taskRun');
    expect(source).toContain('updates');
    expect(source).toContain('submissionId');
    expect(source).toContain('reviewId');
    expect(source).toContain('reviewedSubmissionId');
    expect(source).toContain('referenceFiles');
    expect(source).toContain('rootTeamRunId');
    expect(source).toContain('taskTeamRunIds');
    expect(source).toContain('memberAddress');
    expect(source).toContain('taskAgentRunId');
    expect(source).not.toContain('pendingSubmissionId');
    expect(source).not.toContain('target {');
    expect(source).not.toContain('ingress');
    expect(source).not.toContain('coordinator');
    expect(source).not.toContain('memberRouteKey');
  });
});
