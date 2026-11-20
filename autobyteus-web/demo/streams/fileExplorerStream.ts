/**
 * `/ws/file-explorer/:workspaceId` (autobyteus-279), as the node serves it (`file-explorer-stream-handler.ts`): `CONNECTED`
 * on open and `PONG` for each `PING`. The demo folder never changes on its own, so no `FILE_SYSTEM_CHANGE` follows.
 */
import type { DemoStreamSession } from '../demoTransport';
import type { DemoStreamContext } from './index';

export const openFileExplorerStream = (context: DemoStreamContext, workspaceId: string): DemoStreamSession => ({
  opened: () => context.send(JSON.stringify({ type: 'CONNECTED', payload: {
    workspace_id: workspaceId, session_id: `demo-files-${Math.random().toString(36).slice(2, 10)}`,
  } })),
  received: (data) => {
    const message = JSON.parse(String(data)) as { type?: string };
    if (message.type === 'PING') context.send(JSON.stringify({ type: 'PONG', payload: {} }));
    else console.error(`[demo] the file explorer stream has no answer for ${message.type}`);
  },
});
