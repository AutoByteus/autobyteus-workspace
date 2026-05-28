import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileArtifacts from '../MobileArtifacts.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useRunFileChangesStore, type RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext, AgentTeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { Conversation } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';

let pinia: Pinia;

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

const workspaceContext: MobileWorkContext = {
  kind: 'workspace',
  workspaceId: 'workspace-1',
  title: 'Project Workspace',
  rootPath: '/Users/normy/project',
};

function makeAgentRunConfig(agentDefinitionId = 'agent-1'): AgentRunConfig {
  return {
    agentDefinitionId,
    agentDefinitionName: 'Builder Agent',
    llmModelIdentifier: 'test-model',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: 'workspace-1',
    autoExecuteTools: false,
    skillAccessMode: 'GLOBAL_DISCOVERY',
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

function makeArtifact(runId: string, path: string, updatedAt: string, patch: Partial<RunFileChangeArtifact> = {}): RunFileChangeArtifact {
  return {
    id: `${runId}:${path}`,
    runId,
    path,
    type: 'file',
    status: 'available',
    sourceTool: 'write_file',
    sourceInvocationId: null,
    createdAt: updatedAt,
    updatedAt,
    ...patch,
  };
}

function seedActiveAgentRun(runId = 'run-1'): void {
  useAgentContextsStore().runs.set(runId, makeAgentContext(runId));
  useAgentSelectionStore().selectRunWithoutShellNavigation(runId, 'agent');
}

function seedActiveTeamRun(): AgentTeamContext {
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
    taskPlan: null,
    taskStatuses: null,
  };
  useAgentTeamContextsStore().teams.set(context.teamRunId, context);
  useAgentSelectionStore().selectRunWithoutShellNavigation(context.teamRunId, 'team');
  return context;
}

function makeTeamRunContext(focusedMemberRouteKey = 'lead'): MobileWorkContext {
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

function mountArtifacts(context: MobileWorkContext | null) {
  return mount(MobileArtifacts, {
    props: { context },
    global: {
      plugins: [pinia],
      stubs: {
        ArtifactContentViewer: {
          props: ['artifact', 'refreshSignal'],
          template: '<div data-testid="artifact-content-viewer-stub">{{ artifact?.path || "none" }} refresh:{{ refreshSignal }}</div>',
        },
      },
    },
  });
}

describe('MobileArtifacts', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it('lists active agent-run artifacts newest first and selects the newest artifact', () => {
    seedActiveAgentRun();
    useRunFileChangesStore().replaceRunProjection('run-1', [
      makeArtifact('run-1', 'reports/older.txt', '2026-05-18T16:01:00.000Z'),
      makeArtifact('run-1', 'images/newer.png', '2026-05-18T16:03:00.000Z', { type: 'image' }),
    ]);

    const wrapper = mountArtifacts(agentRunContext);
    const rows = wrapper.findAll('[data-testid="mobile-artifact-row"]');

    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('newer.png');
    expect(rows[1].text()).toContain('older.txt');
    expect(wrapper.get('[data-testid="mobile-artifacts-count"]').text()).toContain('2');
    expect(wrapper.get('[data-testid="artifact-content-viewer-stub"]').text()).toContain('images/newer.png');
  });

  it('passes selected artifacts to the shared viewer and refreshes on reselection', async () => {
    seedActiveAgentRun();
    useRunFileChangesStore().replaceRunProjection('run-1', [
      makeArtifact('run-1', 'reports/older.txt', '2026-05-18T16:01:00.000Z'),
      makeArtifact('run-1', 'images/newer.png', '2026-05-18T16:03:00.000Z', { type: 'image' }),
    ]);

    const wrapper = mountArtifacts(agentRunContext);
    const olderRow = wrapper.findAll('[data-testid="mobile-artifact-row"]')[1];

    await olderRow.trigger('click');
    await nextTick();

    expect(wrapper.get('[data-testid="artifact-content-viewer-stub"]').text()).toContain('reports/older.txt refresh:0');

    await olderRow.trigger('click');
    await nextTick();

    expect(wrapper.get('[data-testid="artifact-content-viewer-stub"]').text()).toContain('reports/older.txt refresh:1');
  });

  it('does not leak stale artifacts into non-run mobile contexts', () => {
    seedActiveAgentRun();
    useRunFileChangesStore().replaceRunProjection('run-1', [
      makeArtifact('run-1', 'reports/active-run.txt', '2026-05-18T16:01:00.000Z'),
    ]);

    const wrapper = mountArtifacts(workspaceContext);

    expect(wrapper.find('[data-testid="mobile-artifact-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-artifacts-no-run-context"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('active-run.txt');
  });

  it('uses the focused team member run id when team focus changes', async () => {
    const team = seedActiveTeamRun();
    const store = useRunFileChangesStore();
    store.replaceRunProjection('lead-run', [
      makeArtifact('lead-run', 'lead/plan.md', '2026-05-18T16:01:00.000Z'),
    ]);
    store.replaceRunProjection('reviewer-run', [
      makeArtifact('reviewer-run', 'review/notes.md', '2026-05-18T16:02:00.000Z'),
    ]);

    const wrapper = mountArtifacts(makeTeamRunContext('lead'));

    expect(wrapper.text()).toContain('plan.md');
    expect(wrapper.text()).not.toContain('notes.md');

    team.focusedMemberRouteKey = 'reviewer';
    await wrapper.setProps({ context: makeTeamRunContext('reviewer') });
    await nextTick();

    expect(wrapper.text()).toContain('notes.md');
    expect(wrapper.text()).not.toContain('plan.md');
  });
});
