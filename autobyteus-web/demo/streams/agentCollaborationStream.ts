/**
 * `/ws/agent-collaboration/:runId` (autobyteus-279), an agent run's collaboration view as the node serves it
 * (`agent-collaboration-stream-handler.ts`): `CONNECTED`, its `ROOT_EXECUTION_VIEW_SNAPSHOT`, its `RUN_TREE_SNAPSHOT` at the
 * same base, then `ROOT_LIFECYCLE`. The demo's trees do not change, so no `run_tree_changed` event follows. Every message
 * is validated by the collaboration contract's schema.
 */
import { CollaborationStreamServerMessageSchema } from '@autobyteus/collaboration-stream-contracts';
import type { DemoStreamSession } from '../demoTransport';
import type { DemoRun } from '../world/DemoWorld';
import { agentRootView } from '../world/rootViews';
import { runTreeOf } from '../world/runTree';
import type { DemoStreamContext } from './index';

export const openAgentCollaborationStream = (context: DemoStreamContext, run: DemoRun): DemoStreamSession => {
  const { world } = context;
  const send = (message: unknown) => context.send(JSON.stringify(CollaborationStreamServerMessageSchema.parse(message)));
  const root = { root_subject_kind: 'agent' as const, root_run_id: run.runId };

  return {
    opened: () => {
      const view = agentRootView(world, run);
      send({ type: 'CONNECTED', payload: { ...root, session_id: `demo-collaboration-${run.runId}-${Math.random().toString(36).slice(2, 10)}` } });
      send({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { ...root, root_agent: view } });
      send({ type: 'RUN_TREE_SNAPSHOT', payload: { ...root, base_change_sequence: view.base_change_sequence, rows: runTreeOf(run).rows } });
      send({ type: 'ROOT_LIFECYCLE', payload: { ...root, is_active: view.is_active } });
    },
    received: (data) => console.error(`[demo] the agent collaboration stream has no answer for ${String(data).slice(0, 80)}`),
    closed: () => {},
  };
};
