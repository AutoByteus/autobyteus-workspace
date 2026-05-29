import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { useMobileFileContextCoordinator } from '../useMobileFileContextCoordinator';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';
import { createWorkspaceContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

let pinia: Pinia;

const workspaceContext: MobileWorkContext = {
  kind: 'workspace',
  workspaceId: 'workspace-1',
  title: 'Project Workspace',
  rootPath: '/Users/normy/project',
};

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

const teamRunContext: MobileWorkContext = {
  kind: 'team-run',
  teamRunId: 'team-run-1',
  teamDefinitionId: 'team-1',
  title: 'Software Team',
  summary: 'Pending team run',
  workspaceRootPath: '/Users/normy/project',
  focusedMemberRouteKey: 'lead',
  isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z',
  statusLabel: 'Running',
};

function makeAgentContext(runId: string): AgentContext {
  const config: AgentRunConfig = {
    agentDefinitionId: 'agent-1',
    agentDefinitionName: 'Builder Agent',
    llmModelIdentifier: 'test-model',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: 'workspace-1',
    autoExecuteTools: false,
    skillAccessMode: 'GLOBAL_DISCOVERY',
    isLocked: false,
  };
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-18T16:00:00.000Z',
    updatedAt: '2026-05-18T16:00:00.000Z',
    agentDefinitionId: 'agent-1',
  };
  return new AgentContext(config, new AgentRunState(runId, conversation));
}

describe('useMobileFileContextCoordinator', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('attaches workspace files to active run, pending team run, and draft contexts without duplicates', () => {
    const coordinator = useMobileFileContextCoordinator();
    const mobileWorkStore = useMobileWorkStore();
    const activeRun = makeAgentContext('run-1');
    useAgentContextsStore().runs.set('run-1', activeRun);
    useAgentSelectionStore().selectRunWithoutShellNavigation('run-1', 'agent');

    const activeResult = coordinator.attachWorkspaceFile('/Users/normy/project/active.md', agentRunContext);
    const activeDuplicate = coordinator.attachWorkspaceFile('/Users/normy/project/active.md', agentRunContext);

    expect(activeResult.target).toBe('active-run');
    expect(activeResult.attached).toBe(true);
    expect(activeDuplicate.attached).toBe(false);
    expect(activeRun.contextFilePaths.map((attachment) => attachment.locator)).toEqual([
      '/Users/normy/project/active.md',
    ]);

    const draftResult = coordinator.attachWorkspaceFile('/Users/normy/project/draft.md', workspaceContext);
    const draftDuplicate = coordinator.attachWorkspaceFile('/Users/normy/project/draft.md', workspaceContext);

    expect(draftResult.target).toBe('mobile-draft');
    expect(draftResult.attached).toBe(true);
    expect(draftDuplicate.attached).toBe(false);
    expect(mobileWorkStore.draftContextAttachments.map((attachment) => attachment.locator)).toEqual([
      '/Users/normy/project/draft.md',
    ]);

    mobileWorkStore.addPendingTeamRunAttachment(
      'team-run-1',
      createWorkspaceContextAttachment('/Users/normy/project/existing-team.md'),
    );

    const pendingResult = coordinator.attachWorkspaceFile('/Users/normy/project/pending-team.md', teamRunContext);
    const pendingDuplicate = coordinator.attachWorkspaceFile('/Users/normy/project/pending-team.md', teamRunContext);

    expect(pendingResult.target).toBe('pending-team-run');
    expect(pendingResult.attached).toBe(true);
    expect(pendingDuplicate.attached).toBe(false);
    expect(mobileWorkStore.getPendingTeamRunAttachments('team-run-1').map((attachment) => attachment.locator)).toEqual([
      '/Users/normy/project/existing-team.md',
      '/Users/normy/project/pending-team.md',
    ]);
  });
});
