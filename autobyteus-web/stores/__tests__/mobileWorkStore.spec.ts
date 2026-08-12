import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const agentRunContext: MobileWorkContext = {
  kind: 'agent-run',
  runId: 'run-1',
  agentDefinitionId: 'agent-1',
  title: 'Builder Agent',
  summary: 'Existing run',
  workspaceRootPath: '/Users/normy/project',
  isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z',
  statusLabel: 'Running',
};

describe('mobileWorkStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('preserves the Artifacts tab through store tab normalization', () => {
    const store = useMobileWorkStore();

    store.setActiveTab('artifacts');

    expect(store.activeTab).toBe('artifacts');
  });

  it('preserves an explicit Artifacts tab when selecting a mobile work context', () => {
    const store = useMobileWorkStore();

    store.selectContext(agentRunContext, 'artifacts');

    expect(store.currentContext).toEqual(agentRunContext);
    expect(store.activeTab).toBe('artifacts');
  });

  it('still falls back unknown tab ids to Chat', () => {
    const store = useMobileWorkStore();

    store.setActiveTab('not-a-mobile-tab');

    expect(store.activeTab).toBe('chat');
  });

  it('hands off one revisioned Event Monitor preview request to Mobile Files', () => {
    const store = useMobileWorkStore();
    store.selectContext(agentRunContext);

    const request = store.requestFilePreview({
      contextKey: 'agent-run:run-1',
      workspaceId: 'workspace-1',
      relativePath: 'docs/report.md',
      source: 'event-monitor',
      readOnly: true,
      presentation: 'inline',
    });

    expect(store.activeTab).toBe('files');
    expect(store.pendingFilePreviewRequest).toEqual(request);
    store.consumeFilePreviewRequest(request.revision);
    expect(store.pendingFilePreviewRequest).toBeNull();
  });

  it('clears a pending preview when team focus changes', () => {
    const store = useMobileWorkStore();
    const teamContext: MobileWorkContext = {
      kind: 'team-run',
      teamRunId: 'team-1',
      teamDefinitionId: 'team-definition-1',
      title: 'Team',
      summary: 'Running team',
      workspaceRootPath: '/Users/normy/project',
      focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/builder' }),
      isActive: true,
      lastActivityAt: '2026-05-18T16:00:00.000Z',
      statusLabel: 'Running',
    };
    store.selectContext(teamContext);
    store.requestFilePreview({
      contextKey: 'team-run:team-1:builder',
      workspaceId: 'workspace-1',
      relativePath: 'stale.md',
      source: 'event-monitor',
      readOnly: true,
      presentation: 'inline',
    });

    expect(store.updateFocusedTeamMember('team-1', createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      memberAddress: '/reviewer',
    }))).toBe(true);
    expect(store.pendingFilePreviewRequest).toBeNull();
  });
});
