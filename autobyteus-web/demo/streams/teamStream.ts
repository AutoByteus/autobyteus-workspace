/**
 * `/ws/agent-team/:teamRunId` (autobyteus-279), a Team run's view as the node serves it (`team-view-session.ts`):
 * `CONNECTED`, its `TEAM_EXECUTION_VIEW_SNAPSHOT` (its tree, its members' statuses and input states), its
 * `RUN_TREE_SNAPSHOT` at the same base, then `TEAM_RUN_LIFECYCLE`. Then, numbered in the run's one change sequence, each
 * member's input (`MEMBER_INPUT_MESSAGE`) and each member's frame (the member's own frame with its `agent_run_id` and the
 * change sequence; a segment's id is `segment_id`). Every message is validated by the Team stream contract.
 */
import { parseTeamStreamClientMessage, teamStreamServerMessageSchema } from '@autobyteus/team-stream-contracts';
import type { DemoStreamSession } from '../demoTransport';
import { statusPayload } from '../runtime';
import type { DemoRun } from '../world/DemoWorld';
import { addressOf, isLive, teamExecutionTree } from '../world/projections';
import { runTreeOf } from '../world/runTree';
import type { DemoStreamContext } from './index';

/** A member's frame in a root view's shape: its own payload, a segment's id as `segment_id`. */
export const rootFramePayload = (type: string, payload: Record<string, unknown>): Record<string, unknown> => {
  if (!type.startsWith('SEGMENT_')) return payload;
  const { id, ...rest } = payload;
  return { segment_id: id, ...rest };
};

export const openTeamStream = (context: DemoStreamContext, run: DemoRun): DemoStreamSession => {
  const { world } = context;
  const runtime = world.runtime;
  const send = (message: unknown) => context.send(JSON.stringify(teamStreamServerMessageSchema.parse(message)));

  const unsubscribe = world.onChange((change) => {
    if (change.type === 'agent_frame' && change.agent.run === run) {
      send({ type: change.frame.type, payload: {
        ...rootFramePayload(change.frame.type, change.frame.payload), change_sequence: change.frame.changeSequence, agent_run_id: change.agent.agentRunId,
      } });
    } else if (change.type === 'member_input' && change.agent.run === run) {
      const { input } = change;
      send({ type: 'MEMBER_INPUT_MESSAGE', payload: {
        change_sequence: input.changeSequence, recipient_agent_run_id: input.recipientAgentRunId, message_id: input.messageId,
        dedupe_key: input.dedupeKey, content: input.content, input_origin: 'user_message', received_at: input.receivedAt,
        context_file_paths: input.contextFilePaths, sender_agent_run_id: null, parent_communication_message_id: null,
      } });
    }
  });

  return {
    opened: () => {
      const sequence = runtime.runSequenceOf(run);
      send({ type: 'CONNECTED', payload: { session_id: `demo-team-${run.runId}-${Math.random().toString(36).slice(2, 10)}`, root_team_run_id: run.runId } });
      send({ type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
        root_team_run_id: run.runId, base_change_sequence: sequence.changeSequence, live_sequence_id: sequence.liveSequenceId,
        last_message_change_sequence: 0, execution_tree: teamExecutionTree(run),
        agent_statuses: run.agents.map((agent) => ({ agent_run_id: agent.agentRunId, member_address: addressOf(agent), ...statusPayload(world, agent) })),
        agent_input_states: run.agents.filter((agent) => agent.status !== 'offline').map((agent) => ({ agent_run_id: agent.agentRunId, state: runtime.inputState(agent) })),
      } });
      send({ type: 'RUN_TREE_SNAPSHOT', payload: { base_change_sequence: sequence.changeSequence, rows: runTreeOf(run).rows } });
      send({ type: 'TEAM_RUN_LIFECYCLE', payload: { is_active: isLive(world, run) } });
    },
    received: (data) => {
      const message = parseTeamStreamClientMessage(String(data));
      const agent = run.agents.find((candidate) => candidate.agentRunId === message.payload.agent_run_id);
      if (!agent) { console.error(`[demo] the Team ${run.runId} has no member ${message.payload.agent_run_id}`); return; }
      if (message.type === 'SEND_MESSAGE') {
        runtime.send(agent, message.payload);
      } else if (message.type === 'INTERRUPT_GENERATION') {
        send({ type: 'AGENT_COMMAND_ACK', payload: { command_type: 'INTERRUPT_GENERATION', command_id: message.payload.command_id, state: 'accepted', agent_run_id: agent.agentRunId } });
        runtime.stop(agent);
      } else {
        console.error(`[demo] the Team stream has no answer for ${message.type}`);
      }
    },
    closed: unsubscribe,
  };
};
