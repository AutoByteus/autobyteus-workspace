import { getDefaultDistributedRuntimeComposition } from "../bootstrap/default-distributed-runtime-composition.js";
import type { PlacementCandidateNode } from "../policies/default-placement-policy.js";

const normalizeSnapshot = (snapshot: PlacementCandidateNode): PlacementCandidateNode => ({
  nodeId: snapshot.nodeId,
  isHealthy: snapshot.isHealthy !== false,
  supportsAgentExecution: snapshot.supportsAgentExecution !== false,
});

export type PlacementCandidateSnapshotProvider = {
  listPlacementCandidateNodes: () => PlacementCandidateNode[];
};

export const createDefaultPlacementCandidateSnapshotProvider =
  (): PlacementCandidateSnapshotProvider => ({
    listPlacementCandidateNodes: () => {
      const snapshots =
        getDefaultDistributedRuntimeComposition().nodeDirectoryService.listPlacementCandidates();
      return snapshots.map((snapshot) => normalizeSnapshot(snapshot));
    },
  });
