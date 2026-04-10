import { defineStore } from 'pinia';
import type { ArtifactType } from '~/stores/agentArtifactsStore';

export type RunFileChangeStatus = 'streaming' | 'pending' | 'available' | 'failed';
export type RunFileChangeSourceTool = 'write_file' | 'edit_file';

export interface RunFileChangeArtifact {
  id: string;
  runId: string;
  path: string;
  type: ArtifactType;
  status: RunFileChangeStatus;
  sourceTool: RunFileChangeSourceTool;
  sourceInvocationId?: string | null;
  backendArtifactId?: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RunFileChangesState {
  entriesByRun: Map<string, RunFileChangeArtifact[]>;
  latestVisibleArtifactIdByRun: Map<string, string | null>;
  latestVisibleArtifactVersionByRun: Map<string, number>;
}

const normalizePath = (value: string): string => value.replace(/\\/g, '/').trim();
const normalizeArtifact = (
  runId: string,
  entry: RunFileChangeArtifact,
): RunFileChangeArtifact => {
  const normalizedPath = normalizePath(entry.path);
  return {
    ...entry,
    id: buildArtifactId(runId, normalizedPath),
    runId,
    path: normalizedPath,
    type: entry.type ?? 'file',
    sourceInvocationId: entry.sourceInvocationId ?? null,
    backendArtifactId: entry.backendArtifactId ?? null,
    content: Object.prototype.hasOwnProperty.call(entry, 'content') ? (entry.content ?? null) : null,
  };
};
const shouldApplyIncomingProjection = (
  existing: RunFileChangeArtifact,
  incoming: RunFileChangeArtifact,
): boolean => incoming.updatedAt.localeCompare(existing.updatedAt) >= 0;
const applyArtifactSnapshot = (
  target: RunFileChangeArtifact,
  source: RunFileChangeArtifact,
): void => {
  target.id = source.id;
  target.runId = source.runId;
  target.path = source.path;
  target.type = source.type;
  target.status = source.status;
  target.sourceTool = source.sourceTool;
  target.sourceInvocationId = source.sourceInvocationId ?? null;
  target.backendArtifactId = source.backendArtifactId ?? null;
  target.content = source.content ?? null;
  target.createdAt = source.createdAt;
  target.updatedAt = source.updatedAt;
};

const announceLatestVisibleArtifact = (
  state: RunFileChangesState,
  runId: string,
  artifactId: string,
): void => {
  state.latestVisibleArtifactIdByRun.set(runId, artifactId);
  const currentVersion = state.latestVisibleArtifactVersionByRun.get(runId) || 0;
  state.latestVisibleArtifactVersionByRun.set(runId, currentVersion + 1);
};

const ensureRunEntries = (state: RunFileChangesState, runId: string): RunFileChangeArtifact[] => {
  if (!state.entriesByRun.has(runId)) {
    state.entriesByRun.set(runId, []);
  }
  return state.entriesByRun.get(runId)!;
};

const buildArtifactId = (runId: string, filePath: string): string => `${runId}:${normalizePath(filePath)}`;

export const useRunFileChangesStore = defineStore('runFileChanges', {
  state: (): RunFileChangesState => ({
    entriesByRun: new Map(),
    latestVisibleArtifactIdByRun: new Map(),
    latestVisibleArtifactVersionByRun: new Map(),
  }),

  getters: {
    getArtifactsForRun: (state) => (runId: string) => state.entriesByRun.get(runId) || [],
    getLatestVisibleArtifactIdForRun: (state) => (runId: string) => state.latestVisibleArtifactIdByRun.get(runId) || null,
    getLatestVisibleArtifactVersionForRun: (state) => (runId: string) => state.latestVisibleArtifactVersionByRun.get(runId) || 0,
    getLatestVisibleArtifactSignalForRun: (state) => (runId: string) => {
      const artifactId = state.latestVisibleArtifactIdByRun.get(runId) || null;
      if (!artifactId) {
        return null;
      }

      const version = state.latestVisibleArtifactVersionByRun.get(runId) || 0;
      return `${artifactId}:${version}`;
    },
  },

  actions: {
    replaceRunProjection(runId: string, entries: RunFileChangeArtifact[]) {
      this.entriesByRun.set(
        runId,
        entries.map((entry) => normalizeArtifact(runId, entry)),
      );
    },

    mergeRunProjection(runId: string, entries: RunFileChangeArtifact[]) {
      const artifacts = ensureRunEntries(this, runId);
      const artifactsById = new Map(artifacts.map((entry) => [entry.id, entry]));

      for (const entry of entries) {
        const normalizedEntry = normalizeArtifact(runId, entry);
        const existing = artifactsById.get(normalizedEntry.id) ?? null;
        if (!existing) {
          artifacts.push(normalizedEntry);
          artifactsById.set(normalizedEntry.id, normalizedEntry);
          continue;
        }

        if (!shouldApplyIncomingProjection(existing, normalizedEntry)) {
          continue;
        }

        applyArtifactSnapshot(existing, normalizedEntry);
      }
    },

    upsertFromLivePayload(payload: RunFileChangeArtifact) {
      const runId = payload.runId;
      const artifacts = ensureRunEntries(this, runId);
      const artifactId = buildArtifactId(runId, payload.path);
      const normalizedPath = normalizePath(payload.path);
      const existing = artifacts.find((entry) => entry.id === artifactId) || null;
      const hasContent = Object.prototype.hasOwnProperty.call(payload, 'content');

      if (existing) {
        const shouldAnnounce =
          typeof payload.sourceInvocationId === 'string' &&
          payload.sourceInvocationId.length > 0 &&
          existing.sourceInvocationId !== payload.sourceInvocationId;

        existing.path = normalizedPath;
        existing.type = payload.type ?? existing.type;
        existing.status = payload.status;
        existing.sourceTool = payload.sourceTool;
        existing.sourceInvocationId = payload.sourceInvocationId ?? existing.sourceInvocationId ?? null;
        existing.backendArtifactId = payload.backendArtifactId ?? existing.backendArtifactId ?? null;
        existing.content = hasContent ? (payload.content ?? null) : (existing.content ?? null);
        existing.createdAt = payload.createdAt || existing.createdAt;
        existing.updatedAt = payload.updatedAt;

        if (shouldAnnounce) {
          announceLatestVisibleArtifact(this, runId, existing.id);
        }
        return existing;
      }

      const artifact: RunFileChangeArtifact = {
        id: artifactId,
        runId,
        path: normalizedPath,
        type: payload.type ?? 'file',
        status: payload.status,
        sourceTool: payload.sourceTool,
        sourceInvocationId: payload.sourceInvocationId ?? null,
        backendArtifactId: payload.backendArtifactId ?? null,
        content: payload.content ?? null,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      };
      artifacts.push(artifact);
      announceLatestVisibleArtifact(this, runId, artifact.id);
      return artifact;
    },

    clearRun(runId: string) {
      this.entriesByRun.delete(runId);
      this.latestVisibleArtifactIdByRun.delete(runId);
      this.latestVisibleArtifactVersionByRun.delete(runId);
    },
  },
});
