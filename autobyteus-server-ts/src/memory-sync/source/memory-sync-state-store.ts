import type { MemorySyncSourceState } from "../shared/memory-sync-types.js";

export interface MemorySyncStateStore {
  readState(hubBaseUrl: string, sourceNodeId: string): Promise<MemorySyncSourceState>;
  writeState(state: MemorySyncSourceState): Promise<void>;
  updateState(
    hubBaseUrl: string,
    sourceNodeId: string,
    updater: (state: MemorySyncSourceState) => MemorySyncSourceState | Promise<MemorySyncSourceState>,
  ): Promise<MemorySyncSourceState>;
}
