/**
 * `/ws/run-status` (autobyteus-279), as the node serves it (`@autobyteus/collaboration-stream-contracts` run-status DTOs):
 * a client subscribes to the runs it shows; the demo node answers their own states and their agents' statuses at once,
 * then each change. Every message is validated by the contract's schema.
 */
import {
  parseRunStatusClientMessage,
  runStatusServerMessageSchema,
  type RunStatusRunRef,
  type RunStatusServerMessage,
} from '@autobyteus/collaboration-stream-contracts';
import type { DemoStreamSession } from '../demoTransport';
import { backgroundTasksRunningOf } from '../world/backgroundTasks';
import type { DemoAgent, DemoRun, DemoWorld } from '../world/DemoWorld';
import type { DemoStreamContext } from './index';

const refOf = (run: DemoRun): RunStatusRunRef => ({ kind: run.kind === 'agent' ? 'agent' : run.kind === 'team' ? 'agent_team' : 'agent_org', runId: run.runId });

const agentState = (world: DemoWorld, agent: DemoAgent) => ({ agentRunId: agent.agentRunId, status: agent.status, backgroundTasksRunning: backgroundTasksRunningOf(world, agent) });

const runState = (world: DemoWorld, run: DemoRun) => ({
  answer: 'ok' as const, node: null, status: world.statusOf(run),
  backgroundTasksRunning: run.agents.reduce((sum, agent) => sum + backgroundTasksRunningOf(world, agent), 0),
});

export const openRunStatusStream = (context: DemoStreamContext): DemoStreamSession => {
  const { world } = context;
  const subscribed = new Map<string, DemoRun>();
  const send = (message: RunStatusServerMessage) => context.send(JSON.stringify(runStatusServerMessageSchema.parse(message)));

  const unsubscribeWorld = world.onChange((change) => {
    if (change.type === 'agent_status') {
      const run = subscribed.get(change.agent.run.runId);
      if (!run) return;
      send({ type: 'RUN_STATUS_CHANGED', payload: { ...refOf(run), ...agentState(world, change.agent) } });
      send({ type: 'RUN_STATE_CHANGED', payload: { ...refOf(run), ...runState(world, run) } });
    }
  });

  return {
    received: (data) => {
      const message = parseRunStatusClientMessage(String(data));
      if (message.type === 'UNSUBSCRIBE') {
        for (const ref of message.payload.runs) subscribed.delete(ref.runId);
        return;
      }
      if (message.type === 'RETRY_PEERS') return; // the demo has no peers
      const runs = message.payload.runs.map((ref) => world.run(ref.runId)).filter((run): run is DemoRun => Boolean(run));
      const unknown = message.payload.runs.filter((ref) => !world.run(ref.runId));
      for (const run of runs) subscribed.set(run.runId, run);
      send({
        type: 'RUN_STATUS_SNAPSHOT',
        payload: {
          runs: [
            ...runs.map((run) => ({ ...refOf(run), ...runState(world, run), agents: run.agents.map((agent) => agentState(world, agent)) })),
            ...unknown.map((ref) => ({ ...ref, answer: 'not_found' as const, node: null, status: null, backgroundTasksRunning: 0, agents: [] })),
          ],
        },
      });
    },
    closed: unsubscribeWorld,
  };
};
