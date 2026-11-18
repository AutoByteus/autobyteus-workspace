import { getMemoryHubIngestionService } from "../memory-sync/hub/memory-hub-ingestion-service.js";
import { isMemorySyncReady } from "../memory-sync/shared/memory-sync-capability.js";

/** Starts the hub's staging sweep once when the node starts, so abandoned partials go even if no source calls again. */
export function loadMemoryHubStagingSweep(): void {
  if (!isMemorySyncReady()) {
    return;
  }
  getMemoryHubIngestionService().requestStagingSweep();
}
