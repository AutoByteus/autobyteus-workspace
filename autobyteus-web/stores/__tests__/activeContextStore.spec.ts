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

  it('observes exact-member Team composer mutations and keeps a captured voice target isolated across focus changes', () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const activeContextStore = useActiveContextStore();
    const solutionRaw = createAgentContext('team-1::solution_designer');
    const implementationRaw = createAgentContext('team-1::implementation_engineer');
    const team = buildTeamContext([
      ['solution_designer', solutionRaw],
      ['implementation_engineer', implementationRaw],
    ], solutionRaw.state.runId);
    teamContextsStore.addTeamContext(team);
    selectionStore.selectRun('team-1', 'team');

    const solution = team.view.getAgentContext(solutionRaw.state.runId)!;
    const implementation = team.view.getAgentContext(implementationRaw.state.runId)!;
    const solutionFile = {
      kind: 'workspace_path', id: 'solution-file', locator: '/tmp/solution.txt',
      displayName: 'solution.txt', type: 'Text',
    } as const;
    const solutionImage = {
      kind: 'workspace_path', id: 'solution-image', locator: '/tmp/solution.png',
      displayName: 'solution.png', type: 'Image',
    } as const;
    const implementationFile = {
      kind: 'workspace_path', id: 'implementation-file', locator: '/tmp/implementation.txt',
      displayName: 'implementation.txt', type: 'Text',
    } as const;

    expect(activeContextStore.activeAgentContext).toBe(solution);
    expect(activeContextStore.currentRequirement).toBe('');
    expect(activeContextStore.currentContextPaths).toEqual([]);
    expect(activeContextStore.submissionPending).toBe(false);
    expect(activeContextStore.currentStatus).toBe(AgentStatus.Running);

    activeContextStore.updateRequirement('Solution draft');
    activeContextStore.addContextFilePath(solutionFile);
    activeContextStore.addContextFilePath(solutionImage);
    solution.submissionPending = true;
    expect(activeContextStore.currentRequirement).toBe('Solution draft');
    expect(activeContextStore.currentContextPaths.map((attachment) => attachment.id))
      .toEqual(['solution-file', 'solution-image']);
    expect(activeContextStore.submissionPending).toBe(true);

    const capturedVoiceTarget = activeContextStore.activeAgentContext;
    teamContextsStore.focusMember('team-1', implementation.state.runId);
    expect(activeContextStore.activeAgentContext).toBe(implementation);
    expect(activeContextStore.currentRequirement).toBe('');
    expect(activeContextStore.currentContextPaths).toEqual([]);
    expect(activeContextStore.submissionPending).toBe(false);

    activeContextStore.updateRequirement('Implementation draft');
    activeContextStore.addContextFilePath(implementationFile);
    implementation.submissionPending = true;
    activeContextStore.updateRequirementForContext(
      capturedVoiceTarget,
      'Solution draft Voice transcript',
    );
    activeContextStore.removeContextFilePathForContext(capturedVoiceTarget, 0);

    expect(activeContextStore.currentRequirement).toBe('Implementation draft');
    expect(activeContextStore.currentContextPaths.map((attachment) => attachment.id))
      .toEqual(['implementation-file']);
    expect(activeContextStore.submissionPending).toBe(true);
    expect(solution.requirement).toBe('Solution draft Voice transcript');
    expect(solution.contextFilePaths.map((attachment) => attachment.id)).toEqual(['solution-image']);

    activeContextStore.clearContextFilePathsForContext(capturedVoiceTarget);
    solution.submissionPending = false;
    teamContextsStore.focusMember('team-1', solution.state.runId);
    expect(activeContextStore.activeAgentContext).toBe(capturedVoiceTarget);
    expect(activeContextStore.currentRequirement).toBe('Solution draft Voice transcript');
    expect(activeContextStore.currentContextPaths).toEqual([]);
    expect(activeContextStore.submissionPending).toBe(false);
    expect(implementation.requirement).toBe('Implementation draft');
    expect(implementation.contextFilePaths.map((attachment) => attachment.id))
      .toEqual(['implementation-file']);
    expect(implementation.submissionPending).toBe(true);
  });

  it('preserves observable standalone Agent draft clearing and transcript insertion', () => {
    const selectionStore = useAgentSelectionStore();
    const agentContextsStore = useAgentContextsStore();
    const activeContextStore = useActiveContextStore();
    agentContextsStore.runs.set('agent-run-standalone', createAgentContext('agent-run-standalone'));
    selectionStore.selectRun('agent-run-standalone', 'agent');
    const standalone = agentContextsStore.runs.get('agent-run-standalone')!;

    expect(activeContextStore.activeAgentContext).toBe(standalone);
    expect(activeContextStore.currentRequirement).toBe('');
    activeContextStore.updateRequirement('Standalone draft');
    expect(activeContextStore.currentRequirement).toBe('Standalone draft');
    activeContextStore.updateRequirementForContext(standalone, 'Standalone draft Voice transcript');
    expect(activeContextStore.currentRequirement).toBe('Standalone draft Voice transcript');
    standalone.requirement = '';
    expect(activeContextStore.currentRequirement).toBe('');
  });
});
