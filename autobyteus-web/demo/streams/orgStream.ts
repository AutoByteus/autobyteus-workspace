/**
 * `/ws/agent-org/:orgRunId` (autobyteus-279), an Org run's view as the node serves it: `CONNECTED`, its
 * `ROOT_EXECUTION_VIEW_SNAPSHOT` (`orgRootView`, the view its inspection answers), its `RUN_TREE_SNAPSHOT` at the same
 * base, then `ROOT_LIFECYCLE`. Then, numbered in the run's one change sequence, each agent's input and frames as
 * `agent_presentation` events. Commands name their target agent and are acknowledged. Every message is validated by the
 * collaboration contract.
 */
import { CollaborationStreamClientMessageSchema, CollaborationStreamServerMessageSchema } from '@autobyteus/collaboration-stream-contracts';
import type { DemoStreamSession } from '../demoTransport';
import type { DemoRun } from '../world/DemoWorld';
import { addressOf } from '../world/projections';
import { orgRootView } from '../world/rootViews';
import { runTreeOf } from '../world/runTree';
import type { DemoStreamContext } from './index';
import { rootFramePayload } from './teamStream';

export const openOrgStream = (context: DemoStreamContext, run: DemoRun): DemoStreamSession => {
  const { world } = context;
  const runtime = world.runtime;
  const root = { root_subject_kind: 'agent_org' as const, root_run_id: run.runId };
  const send = (message: unknown) => context.send(JSON.stringify(CollaborationStreamServerMessageSchema.parse(message)));
  const event = (changeSequence: number, agentRunId: string, memberAddress: string, message: { type: string; payload: unknown }) =>
    send({ type: 'ROOT_EXECUTION_EVENT', payload: { ...root, change_sequence: changeSequence, event: { kind: 'agent_presentation', member_address: memberAddress, agent_run_id: agentRunId, message } } });

  const unsubscribe = world.onChange((change) => {
    if (change.type === 'agent_frame' && change.agent.run === run) {
      event(change.frame.changeSequence, change.agent.agentRunId, addressOf(change.agent),
        { type: change.frame.type, payload: rootFramePayload(change.frame.type, change.frame.payload) });
    } else if (change.type === 'member_input' && change.agent.run === run) {
      const { input } = change;
      event(input.changeSequence, change.agent.agentRunId, addressOf(change.agent), { type: 'MEMBER_INPUT_MESSAGE', payload: {
        message_id: input.messageId, dedupe_key: input.dedupeKey, content: input.content, input_origin: 'user_message', received_at: input.receivedAt,
        context_file_paths: input.contextFilePaths, sender_agent_run_id: null, parent_communication_message_id: null,
      } });
    }
  });

  const ack = (commandType: 'SEND_MESSAGE' | 'INTERRUPT_GENERATION', commandId: string, target: string) => send({ type: 'AGENT_COMMAND_ACK', payload: {
    ...root, command_id: commandId, command_type: commandType, target_agent_run_id: target, state: 'accepted', code: null, message: null,
  } });

  return {
    opened: () => {
      const view = orgRootView(world, run);
      send({ type: 'CONNECTED', payload: { ...root, session_id: `demo-org-${run.runId}-${Math.random().toString(36).slice(2, 10)}` } });
      send({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { ...root, root_org: view } });
      send({ type: 'RUN_TREE_SNAPSHOT', payload: { ...root, base_change_sequence: view.base_change_sequence, rows: runTreeOf(run).rows } });
      send({ type: 'ROOT_LIFECYCLE', payload: { ...root, is_active: view.is_active } });
    },
    received: (data) => {
      const message = CollaborationStreamClientMessageSchema.parse(JSON.parse(String(data)));
      const agent = run.agents.find((candidate) => candidate.agentRunId === message.payload.target_agent_run_id);
      if (!agent) { console.error(`[demo] the Org ${run.runId} has no agent ${message.payload.target_agent_run_id}`); return; }
      if (message.type === 'SEND_MESSAGE') {
        ack('SEND_MESSAGE', message.payload.command_id, agent.agentRunId);
        runtime.send(agent, message.payload);
      } else if (message.type === 'INTERRUPT_GENERATION') {
        ack('INTERRUPT_GENERATION', message.payload.command_id, agent.agentRunId);
        runtime.stop(agent);
      } else {
        console.error(`[demo] the Org stream has no answer for ${message.type}`);
      }
    },
    closed: unsubscribe,
  };
};
