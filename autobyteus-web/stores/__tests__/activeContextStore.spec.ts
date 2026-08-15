import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useActiveContextStore } from '../activeContextStore';
import { useAgentContextsStore } from '../agentContextsStore';
import { useAgentSelectionStore } from '../agentSelectionStore';
import { useAgentTeamContextsStore } from '../agentTeamContextsStore';
import { useAgentRunStore } from '../agentRunStore';
import { useAgentTeamRunStore } from '../agentTeamRunStore';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => ({ showChat: vi.fn() }),
}));

const createAgentContext = (runId: string): AgentContext => {
  const config: AgentRunConfig = {
    agentDefinitionId: `def-${runId}`,
    agentDefinitionName: `Agent ${runId}`,
    llmModelIdentifier: 'model-x',
    runtimeKind: 'codex_app_server',
    workspaceId: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    llmConfig: null,
    isLocked: false,
  } as AgentRunConfig;
  const conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-16T00:00:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z',
    agentDefinitionId: config.agentDefinitionId,
  } as any;
  const context = new AgentContext(config, new AgentRunState(runId, conversation));
  context.state.currentStatus = AgentStatus.Running;
  return context;
};

const buildTeamContext = (
  members: Array<[string, AgentContext]>,
  focusedAgentRunId: string,
  isActive = true,
) => buildTestTeamContext({
  teamRunId: 'team-1',
  teamDefinitionId: 'team-def-1',
  rootChildren: members.map(([memberAddress, context]) => testAgentNode(
    memberAddress.startsWith('/') ? memberAddress : `/${memberAddress}`,
    { agentRunId: context.state.runId, currentStatus: context.state.currentStatus },
  )),
  contexts: members.map(([, context]) => ({ agentRunId: context.state.runId, context })),
  focusedAgentRunId,
  isActive,
});

describe('activeContextStore interrupt routing', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('targets the focused team member route key at click time', () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const teamRunStore = useAgentTeamRunStore();
    const activeContextStore = useActiveContextStore();

    const solutionDesigner = createAgentContext('team-1::solution_designer');
    const codeReviewer = createAgentContext('team-1::code_reviewer');
    teamContextsStore.addTeamContext(buildTeamContext([
      ['solution_designer', solutionDesigner],
      ['code_reviewer', codeReviewer],
    ], solutionDesigner.state.runId));
    selectionStore.selectRun('team-1', 'team');

    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::solution_designer');
    teamContextsStore.focusMember('team-1', codeReviewer.state.runId);

    const interruptFocusedMember = vi
      .spyOn(teamRunStore, 'interruptFocusedMemberGeneration')
      .mockReturnValue(true);

    const result = activeContextStore.interruptGeneration();

    expect(result).toBe(true);
    expect(interruptFocusedMember).toHaveBeenCalledWith({
      teamRunId: 'team-1',
      agentRunId: 'team-1::code_reviewer',
    });
  });

  it('preserves single-agent interrupt routing', () => {
    const selectionStore = useAgentSelectionStore();
    const agentContextsStore = useAgentContextsStore();
    const agentRunStore = useAgentRunStore();
    const teamRunStore = useAgentTeamRunStore();
    const activeContextStore = useActiveContextStore();
    const agentContext = createAgentContext('agent-run-1');

    agentContextsStore.runs.set('agent-run-1', agentContext);
    selectionStore.selectRun('agent-run-1', 'agent');

    const interruptAgent = vi.spyOn(agentRunStore, 'interruptGeneration').mockReturnValue(true);
    const interruptTeam = vi.spyOn(teamRunStore, 'interruptFocusedMemberGeneration');

    const result = activeContextStore.interruptGeneration();

    expect(result).toBe(true);
    expect(interruptAgent).toHaveBeenCalledWith('agent-run-1');
    expect(interruptTeam).not.toHaveBeenCalled();
  });

  it('routes only the exact focused AgentRun through the team target', () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const teamRunStore = useAgentTeamRunStore();
    const activeContextStore = useActiveContextStore();
    const solutionDesigner = createAgentContext('team-1::solution_designer');

    teamContextsStore.addTeamContext(buildTeamContext([
      ['solution_designer', solutionDesigner],
    ], solutionDesigner.state.runId));
    selectionStore.selectRun('team-1', 'team');

    const activeTeam = teamContextsStore.activeTeamContext!;
    activeTeam.view.focusAgent(solutionDesigner.state.runId);
    const interruptFocusedMember = vi
      .spyOn(teamRunStore, 'interruptFocusedMemberGeneration')
      .mockReturnValue(true);

    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::solution_designer');
    expect(activeContextStore.interruptGeneration()).toBe(true);
    expect(interruptFocusedMember).toHaveBeenCalledWith({
      teamRunId: 'team-1',
      agentRunId: 'team-1::solution_designer',
    });
  });

  it('keeps composer context on the visible focused member even when active-execution display falls back', () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const activeContextStore = useActiveContextStore();

    const solutionDesigner = createAgentContext('team-1::solution_designer');
    const deliveryEngineer = createAgentContext('team-1::delivery_engineer');
    solutionDesigner.state.currentStatus = AgentStatus.Offline;
    deliveryEngineer.state.currentStatus = AgentStatus.Offline;
    teamContextsStore.addTeamContext({
      ...buildTeamContext([
        ['solution_designer', solutionDesigner],
        ['delivery_engineer', deliveryEngineer],
      ], deliveryEngineer.state.runId, false),
    });
    selectionStore.selectRun('team-1', 'team');

    expect(teamContextsStore.activeTeamContext?.view.getFocusedMemberAddress()).toBe('/delivery_engineer');
    expect(teamContextsStore.activeExecutionFocusedMemberAddress).toBe('/delivery_engineer');
    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::delivery_engineer');
  });
});
