import type { IpcMain } from 'electron';
import {
  NODE_AUTO_UPDATE_IPC_GET_STATE,
  NODE_AUTO_UPDATE_IPC_MARK_READ,
  NODE_AUTO_UPDATE_IPC_RECHECK,
  type NodeAutoUpdateEntries,
} from '../../shared/nodeAutoUpdateTypes';
import type { NodeAutoUpdateRecord } from './nodeAutoUpdateRecord';

/**
 * The windows read the node outcomes, mark one as seen, and ask the main process to read a node again about its failed
 * update (autobyteus-412; `recheck` is `NodeAutoUpdater.recheckFailure`, the result comes by broadcast). They never
 * start a node update (REQ-006).
 */
export function registerNodeAutoUpdateIpc(
  ipc: Pick<IpcMain, 'handle'>,
  record: NodeAutoUpdateRecord,
  onChange: (entries: NodeAutoUpdateEntries) => void,
  recheck: (entryId: string) => void,
): void {
  ipc.handle(NODE_AUTO_UPDATE_IPC_GET_STATE, () => record.all());
  ipc.handle(NODE_AUTO_UPDATE_IPC_MARK_READ, (_event, entryId: unknown) => {
    if (typeof entryId === 'string' && record.markRead(entryId)) onChange(record.all());
    return record.all();
  });
  ipc.handle(NODE_AUTO_UPDATE_IPC_RECHECK, (_event, entryId: unknown) => {
    if (typeof entryId === 'string') recheck(entryId);
  });
}
