import { startMemorySyncWorker } from "../memory-sync/source/memory-sync-worker.js";

export function loadMemorySyncWorker(): void {
  startMemorySyncWorker();
}
