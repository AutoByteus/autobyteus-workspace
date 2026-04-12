import { SemanticItem } from '../models/semantic-item.js';
import { COMPACTED_MEMORY_SCHEMA_VERSION } from '../store/compacted-memory-manifest.js';
import { MemoryStore } from '../store/base-store.js';
import type { WorkingContextSnapshotStore } from '../store/working-context-snapshot-store.js';

export type CompactedMemorySchemaGateResult = {
  didReset: boolean;
};

const hasSchemaMismatchRecords = (semanticDicts: Record<string, unknown>[]): boolean =>
  semanticDicts.some((record) => !SemanticItem.isSerializedDict(record));

export class CompactedMemorySchemaGate {
  supports(store: unknown): store is MemoryStore {
    if (!store || typeof store !== 'object') {
      return false;
    }

    const candidate = store as MemoryStore;
    return (
      candidate.readSemanticDicts !== MemoryStore.prototype.readSemanticDicts &&
      candidate.clearSemanticItems !== MemoryStore.prototype.clearSemanticItems &&
      candidate.readCompactedMemoryManifest !== MemoryStore.prototype.readCompactedMemoryManifest &&
      candidate.writeCompactedMemoryManifest !== MemoryStore.prototype.writeCompactedMemoryManifest
    );
  }

  ensureCurrentSchema(
    store: MemoryStore,
    snapshotStore: WorkingContextSnapshotStore | null = null,
    agentId: string | null = null,
  ): CompactedMemorySchemaGateResult {
    const manifest = store.readCompactedMemoryManifest();
    const semanticDicts = store.readSemanticDicts();
    const hasStaleSemanticData = hasSchemaMismatchRecords(semanticDicts);

    if (!hasStaleSemanticData && manifest?.schema_version === COMPACTED_MEMORY_SCHEMA_VERSION) {
      return { didReset: false };
    }

    const now = Date.now();

    if (hasStaleSemanticData) {
      store.clearSemanticItems();
      store.writeCompactedMemoryManifest({
        schema_version: COMPACTED_MEMORY_SCHEMA_VERSION,
        last_reset_ts: now,
      });
      const resolvedAgentId = agentId ?? snapshotStore?.agentId ?? null;
      if (snapshotStore && resolvedAgentId) {
        snapshotStore.delete(resolvedAgentId);
      }
      return { didReset: true };
    }

    store.writeCompactedMemoryManifest({
      schema_version: COMPACTED_MEMORY_SCHEMA_VERSION,
      last_reset_ts: now,
    });
    return { didReset: false };
  }
}
