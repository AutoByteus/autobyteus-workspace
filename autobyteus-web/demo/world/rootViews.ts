/**
 * The root views the node answers for an agent run and an Org run (autobyteus-279), as its projectors build them
 * (`agent-collaboration-view-projector.ts`, `agent-org-execution-view-projector.ts`). The same view answers the query
 * and opens the run's stream. Each is validated by the collaboration contract.
 */
import { RootExecutionViewDtoSchema, type AgentOrgExecutionViewDto, type AgentRunCollaborationViewDto } from '@autobyteus/collaboration-stream-contracts';
import { statusPayload } from '../runtime';
import type { DemoRun, DemoWorld } from './DemoWorld';
import { addressOf, isLive, orgExecutionTree } from './projections';
import { delegatedAddressOf } from './runTree';

/** The node keeps an agent run's collaboration view only once it has delegated; `agentRunCollaboration` is null otherwise. */
export const hasAgentRootView = (run: DemoRun): boolean => run.kind === 'agent' && run.coordinator.delegated.length > 0;

/** An agent run's view: its own agent as its tree, at base 0 (the demo's trees do not change). */
export const agentRootView = (world: DemoWorld, run: DemoRun): AgentRunCollaborationViewDto => {
  const live = isLive(world, run);
  const view = RootExecutionViewDtoSchema.parse({
    root_subject_kind: 'agent', root_run_id: run.runId,
    root_agent: {
      base_change_sequence: 0, live_sequence_id: live ? `demo-collaboration-seq-${run.runId}` : null,
      last_message_change_sequence: live ? 0 : null, is_active: live,
      execution_tree: { subjectKind: 'agent', createdAt: run.createdAt, agent: {
        address: delegatedAddressOf(run), agentRunId: run.runId, agentDefinitionId: run.coordinator.definitionId,
      } },
    },
  });
  if (view.root_subject_kind !== 'agent') throw new Error('An agent run has an Agent-root view.');
  return view.root_agent;
};

/**
 * An Org run's view at its change sequence: its tree, and the statuses and input states of its live agents (a stopped
 * Org has none, as on the node).
 */
export const orgRootView = (world: DemoWorld, run: DemoRun): AgentOrgExecutionViewDto => {
  const live = isLive(world, run);
  const sequence = world.runtime.runSequenceOf(run);
  const agents = run.agents.filter((agent) => agent.status !== 'offline');
  const view = RootExecutionViewDtoSchema.parse({
    root_subject_kind: 'agent_org', root_run_id: run.runId,
    root_org: {
      base_change_sequence: sequence.changeSequence, is_active: live,
      live_sequence_id: live ? sequence.liveSequenceId : null, last_message_change_sequence: live ? 0 : null,
      execution_tree: orgExecutionTree(run),
      agent_statuses: agents.map((agent) => ({ member_address: addressOf(agent), agent_run_id: agent.agentRunId, ...statusPayload(world, agent) })),
      agent_input_states: agents.map((agent) => ({ agent_run_id: agent.agentRunId, state: world.runtime.inputState(agent) })),
    },
  });
  if (view.root_subject_kind !== 'agent_org') throw new Error('An Org run has an Org-root view.');
  return view.root_org;
};
