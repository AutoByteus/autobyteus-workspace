import type { MemorySyncSourceState } from "../shared/memory-sync-types.js";

export interface MemorySyncStateStore {
  readState(hubBaseUrl: string, memorySyncSourceId: string): Promise<MemorySyncSourceState>;
  writeState(state: MemorySyncSourceState): Promise<void>;
  updateState(
    hubBaseUrl: string,
    memorySyncSourceId: string,
    updater: (state: MemorySyncSourceState) => MemorySyncSourceState | Promise<MemorySyncSourceState>,
  ): Promise<MemorySyncSourceState>;
}
