/**
 * `/ws/agent-collaboration/:runId` (autobyteus-279), an agent run's collaboration view as the node serves it
 * (`agent-collaboration-stream-handler.ts`): `CONNECTED`, its `ROOT_EXECUTION_VIEW_SNAPSHOT`, its `RUN_TREE_SNAPSHOT` at the
 * same base, then `ROOT_LIFECYCLE`; a change of its tree follows as a numbered `run_tree_changed` event. Every message is
 * validated by the collaboration contract's schema.
 */
import { CollaborationStreamServerMessageSchema } from '@autobyteus/collaboration-stream-contracts';
import type { DemoStreamSession } from '../demoTransport';
import type { DemoRun } from '../world/DemoWorld';
import { isLive } from '../world/projections';
import { delegatedAddressOf, runTreeOf } from '../world/runTree';
import type { DemoStreamContext } from './index';

export const openAgentCollaborationStream = (context: DemoStreamContext, run: DemoRun): DemoStreamSession => {
  const { world } = context;
  const send = (message: unknown) => context.send(JSON.stringify(CollaborationStreamServerMessageSchema.parse(message)));
  const root = { root_subject_kind: 'agent' as const, root_run_id: run.runId };
  let changeSequence = 0;
  let rows = runTreeOf(run).rows;

  const unsubscribe = world.onChange((change) => {
    if (change.type !== 'run_tree' || change.root !== world.rootOf(run)) return;
    const next = runTreeOf(run).rows;
    const before = new Map(rows.map((row) => [row.key, JSON.stringify(row)]));
    const keys = new Set(next.map((row) => row.key));
    changeSequence += 1;
    send({ type: 'ROOT_EXECUTION_EVENT', payload: { ...root, change_sequence: changeSequence, event: {
      kind: 'run_tree_changed',
      added: next.filter((row) => !before.has(row.key)),
      removed: rows.filter((row) => !keys.has(row.key)).map((row) => row.key),
      updated: next.filter((row) => before.has(row.key) && before.get(row.key) !== JSON.stringify(row)),
    } } });
    rows = next;
  });

  return {
    opened: () => {
      const live = isLive(world, run);
      send({ type: 'CONNECTED', payload: { ...root, session_id: `demo-collaboration-${run.runId}-${Math.random().toString(36).slice(2, 10)}` } });
      send({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { ...root, root_agent: {
        base_change_sequence: changeSequence, live_sequence_id: live ? `demo-collaboration-seq-${run.runId}` : null,
        last_message_change_sequence: live ? 0 : null, is_active: live,
        execution_tree: { subjectKind: 'agent', createdAt: run.createdAt, agent: {
          address: delegatedAddressOf(run), agentRunId: run.runId, agentDefinitionId: run.coordinator.definitionId,
        } },
      } } });
      send({ type: 'RUN_TREE_SNAPSHOT', payload: { ...root, base_change_sequence: changeSequence, rows } });
      send({ type: 'ROOT_LIFECYCLE', payload: { ...root, is_active: live } });
    },
    received: (data) => console.error(`[demo] the agent collaboration stream has no answer for ${String(data).slice(0, 80)}`),
    closed: unsubscribe,
  };
};
