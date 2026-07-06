import { beforeEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useMobileFocusedRunIdentity } from '~/composables/mobile/useMobileFocusedRunIdentity';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext, AgentTeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { Conversation } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';

function makeAgentRunConfig(agentDefinitionId = 'agent-1'): AgentRunConfig {
  return {
    agentDefinitionId,
    agentDefinitionName: 'Builder Agent',
    llmModelIdentifier: 'test-model',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: 'workspace-1',
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    isLocked: false,
  };
}

function makeAgentContext(runId: string, agentDefinitionId = 'agent-1'): AgentContext {
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-18T16:00:00.000Z',
    updatedAt: '2026-05-18T16:00:00.000Z',
    agentDefinitionId,
  };
  return new AgentContext(makeAgentRunConfig(agentDefinitionId), new AgentRunState(runId, conversation));
}

function makeAgentRunMobileContext(runId = 'run-1'): MobileWorkContext {
  return {
    kind: 'agent-run',
    runId,
    agentDefinitionId: 'agent-1',
    title: 'Builder Agent',
    summary: 'Existing run',
    workspaceRootPath: '/Users/normy/project',
    isActive: true,
    lastActivityAt: '2026-05-18T16:00:00.000Z',
    statusLabel: 'Running',
  };
}

function seedTeamRun(): AgentTeamContext {
  const leadNode: AgentTeamMemberNode = {
    memberKind: 'agent',
    memberName: 'lead',
    displayName: 'Lead',
    memberPath: ['lead'],
    memberRouteKey: 'lead',
    memberRunId: 'lead-run',
    agentDefinitionId: 'agent-1',
  };
  const reviewerNode: AgentTeamMemberNode = {
    memberKind: 'agent',
    memberName: 'reviewer',
    displayName: 'Reviewer',
    memberPath: ['reviewer'],
    memberRouteKey: 'reviewer',
    memberRunId: 'reviewer-run',
    agentDefinitionId: 'agent-1',
  };
  const context: AgentTeamContext = {
    teamRunId: 'team-run-1',
    config: {
      teamDefinitionId: 'team-1',
      teamDefinitionName: 'Software Team',
      runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId: 'workspace-1',
      llmModelIdentifier: 'test-model',
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      memberOverrides: {},
      isLocked: false,
    },
    memberTree: [leadNode, reviewerNode],
    memberNodesByRouteKey: new Map([
      ['lead', leadNode],
      ['reviewer', reviewerNode],
    ]),
    leafAgentContextsByRouteKey: new Map([
      ['lead', makeAgentContext('lead-run')],
      ['reviewer', makeAgentContext('reviewer-run')],
    ]),
    coordinatorMemberRouteKey: 'lead',
    historicalHydration: null,
    focusedMemberRouteKey: 'lead',
    currentStatus: AgentTeamStatus.Offline,
    isSubscribed: false,
  };
  useAgentTeamContextsStore().teams.set(context.teamRunId, context);
  useAgentSelectionStore().selectRunWithoutShellNavigation(context.teamRunId, 'team');
  return context;
}

function makeTeamRunMobileContext(focusedMemberRouteKey = 'lead'): MobileWorkContext {
  return {
    kind: 'team-run',
    teamRunId: 'team-run-1',
    teamDefinitionId: 'team-1',
    title: 'Software Team',
    summary: 'Existing team run',
    workspaceRootPath: '/Users/normy/project',
    focusedMemberRouteKey,
    isActive: true,
    lastActivityAt: '2026-05-18T16:00:00.000Z',
    statusLabel: 'Running',
  };
}

describe('useMobileFocusedRunIdentity', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('resolves the selected agent run only when the mobile context and active context match', () => {
    useAgentContextsStore().runs.set('run-1', makeAgentContext('run-1'));
    useAgentSelectionStore().selectRunWithoutShellNavigation('run-1', 'agent');
    const context = ref<MobileWorkContext | null>(makeAgentRunMobileContext('run-1'));

    const { focusedRunId, isRunContext } = useMobileFocusedRunIdentity(context);

    expect(isRunContext.value).toBe(true);
    expect(focusedRunId.value).toBe('run-1');

    context.value = makeAgentRunMobileContext('other-run');

    expect(focusedRunId.value).toBe('');
  });

  it('returns no focused run id for non-run and stale selected contexts', () => {
    useAgentContextsStore().runs.set('run-1', makeAgentContext('run-1'));
    useAgentSelectionStore().selectRunWithoutShellNavigation('run-1', 'agent');
    const context = ref<MobileWorkContext | null>({
      kind: 'workspace',
      workspaceId: 'workspace-1',
      title: 'Project Workspace',
      rootPath: '/Users/normy/project',
    });

    const { focusedRunId, isRunContext } = useMobileFocusedRunIdentity(context);

    expect(isRunContext.value).toBe(false);
    expect(focusedRunId.value).toBe('');

    context.value = makeAgentRunMobileContext('run-1');
    useAgentSelectionStore().selectRunWithoutShellNavigation('different-run', 'agent');

    expect(focusedRunId.value).toBe('');
  });

  it('resolves the focused leaf member run for selected team contexts', () => {
    const team = seedTeamRun();
    const context = ref<MobileWorkContext | null>(makeTeamRunMobileContext('lead'));

    const { focusedRunId } = useMobileFocusedRunIdentity(context);

    expect(focusedRunId.value).toBe('lead-run');

    team.focusedMemberRouteKey = 'reviewer';
    context.value = makeTeamRunMobileContext('reviewer');

    expect(focusedRunId.value).toBe('reviewer-run');
  });

  it('rejects team contexts when selected team or focused route is stale', () => {
    const team = seedTeamRun();
    const context = ref<MobileWorkContext | null>(makeTeamRunMobileContext('lead'));
    const { focusedRunId } = useMobileFocusedRunIdentity(context);

    useAgentSelectionStore().selectRunWithoutShellNavigation('other-team-run', 'team');
    expect(focusedRunId.value).toBe('');

    useAgentSelectionStore().selectRunWithoutShellNavigation('team-run-1', 'team');
    team.focusedMemberRouteKey = 'reviewer';
    expect(focusedRunId.value).toBe('');
  });
});
