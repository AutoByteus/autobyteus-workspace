import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { useActiveContextStore } from '../activeContextStore';
import { useAgentContextsStore } from '../agentContextsStore';
import { useAgentSelectionStore } from '../agentSelectionStore';
import { useAgentTeamContextsStore } from '../agentTeamContextsStore';
import { useAgentRunStore } from '../agentRunStore';
import { useAgentTeamRunStore } from '../agentTeamRunStore';

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
  context.state.canInterrupt = true;
  return context;
};

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
    teamContextsStore.addTeamContext({
      teamRunId: 'team-1',
      config: { teamDefinitionId: 'team-def-1' } as any,
      members: new Map([
        ['solution_designer', solutionDesigner],
        ['code_reviewer', codeReviewer],
      ]),
      coordinatorMemberRouteKey: 'solution_designer',
      focusedMemberName: 'solution_designer',
      currentStatus: AgentTeamStatus.Running,
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    });
    selectionStore.selectRun('team-1', 'team');

    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::solution_designer');
    teamContextsStore.setFocusedMember('code_reviewer');

    const interruptFocusedMember = vi
      .spyOn(teamRunStore, 'interruptFocusedMemberGeneration')
      .mockReturnValue(true);

    const result = activeContextStore.interruptGeneration();

    expect(result).toBe(true);
    expect(interruptFocusedMember).toHaveBeenCalledWith({
      teamRunId: 'team-1',
      targetMemberRouteKey: 'code_reviewer',
      targetAgentRunId: 'team-1::code_reviewer',
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

  it('rejects ambiguous focused team targets before sending a backend interrupt', () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const teamRunStore = useAgentTeamRunStore();
    const activeContextStore = useActiveContextStore();
    const solutionDesigner = createAgentContext('team-1::solution_designer');

    teamContextsStore.addTeamContext({
      teamRunId: 'team-1',
      config: { teamDefinitionId: 'team-def-1' } as any,
      members: new Map([['solution_designer', solutionDesigner]]),
      coordinatorMemberRouteKey: 'solution_designer',
      focusedMemberName: 'solution_designer',
      currentStatus: AgentTeamStatus.Running,
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    });
    selectionStore.selectRun('team-1', 'team');

    const activeTeam = teamContextsStore.activeTeamContext!;
    activeTeam.focusedMemberName = 'missing_member';
    const interruptFocusedMember = vi.spyOn(teamRunStore, 'interruptFocusedMemberGeneration');

    expect(() => activeContextStore.interruptGeneration()).toThrow('No active agent context');
    expect(interruptFocusedMember).not.toHaveBeenCalled();
  });
});
