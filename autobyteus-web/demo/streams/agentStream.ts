/**
 * `/ws/agent/:runId` (autobyteus-279), as the node serves it (`autobyteus-server-ts/src/services/agent-streaming`):
 * `CONNECTED`, the agent's `AGENT_STATUS`, then its `AGENT_STREAM_SNAPSHOT` (its stored projection; for a live run its
 * input state and the base of its own numbered sequence). Then each frame the demo's runtime publishes for the agent.
 * `SEND_MESSAGE` and `INTERRUPT_GENERATION` go to the runtime, and their acknowledgements to this socket only.
 */
import type { DemoStreamSession } from '../demoTransport';
import { statusPayload } from '../runtime';
import { activitiesOf, conversationOf } from '../world/conversations';
import type { DemoAgent } from '../world/DemoWorld';
import type { DemoStreamContext } from './index';

type ClientMessage = { type?: string; payload?: Record<string, unknown> };

export const openAgentStream = (context: DemoStreamContext, agent: DemoAgent): DemoStreamSession => {
  const { world } = context;
  const runtime = world.runtime;
  const send = (message: unknown) => context.send(JSON.stringify(message));
  const sessionId = `demo-session-${agent.agentRunId}-${Math.random().toString(36).slice(2, 10)}`;

  const unsubscribe = world.onChange((change) => {
    if (change.type === 'agent_frame' && change.agent === agent) {
      send({ type: change.frame.type, payload: change.frame.payload, sequence: change.frame.sequence });
    }
  });

  return {
    opened: () => {
      const live = agent.status !== 'offline';
      const stream = runtime.streamOf(agent);
      send({ type: 'CONNECTED', payload: { agent_id: agent.agentRunId, session_id: sessionId } });
      send({ type: 'AGENT_STATUS', payload: statusPayload(world, agent) });
      send({
        type: 'AGENT_STREAM_SNAPSHOT',
        payload: {
          stored: {
            runId: agent.agentRunId, conversation: conversationOf(world, agent), activities: activitiesOf(world, agent),
            summary: agent.run.summary, lastActivityAt: agent.lastActivityAt, hasEarlierActiveTraceEvents: false,
          },
          // A stopped run's snapshot is its whole stored conversation, with no sequence and no input state.
          input_state: live ? runtime.inputState(agent) : null,
          turn_frames: [],
          base_sequence: stream.sequence,
          live_sequence_id: live ? stream.liveSequenceId : null,
        },
      });
    },
    received: (data) => {
      const message = JSON.parse(String(data)) as ClientMessage;
      const payload = message.payload ?? {};
      if (message.type === 'SEND_MESSAGE') {
        send({ type: 'AGENT_COMMAND_ACK', payload: runtime.send(agent, payload) });
      } else if (message.type === 'INTERRUPT_GENERATION') {
        send({ type: 'AGENT_COMMAND_ACK', payload: {
          command_type: 'INTERRUPT_GENERATION', command_id: String(payload.command_id ?? ''), state: 'accepted',
          target: { target_kind: 'standalone_run', run_id: agent.agentRunId },
        } });
        runtime.stop(agent);
      } else {
        console.error(`[demo] the agent stream has no answer for ${message.type}`);
      }
    },
    closed: unsubscribe,
  };
};
