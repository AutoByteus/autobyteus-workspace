import type { IpcMain } from 'electron';
import {
  NODE_AUTO_UPDATE_IPC_GET_STATE,
  NODE_AUTO_UPDATE_IPC_MARK_READ,
  type NodeAutoUpdateEntries,
} from '../../shared/nodeAutoUpdateTypes';
import type { NodeAutoUpdateRecord } from './nodeAutoUpdateRecord';

/** The windows read the node outcomes and mark one as seen; they never start a node update (REQ-006). */
export function registerNodeAutoUpdateIpc(
  ipc: Pick<IpcMain, 'handle'>,
  record: NodeAutoUpdateRecord,
  onChange: (entries: NodeAutoUpdateEntries) => void,
): void {
  ipc.handle(NODE_AUTO_UPDATE_IPC_GET_STATE, () => record.all());
  ipc.handle(NODE_AUTO_UPDATE_IPC_MARK_READ, (_event, entryId: unknown) => {
    if (typeof entryId === 'string' && record.markRead(entryId)) onChange(record.all());
    return record.all();
  });
}
