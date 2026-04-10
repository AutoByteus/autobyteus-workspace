import { defineStore } from 'pinia';

export type ArtifactStatus = 'streaming' | 'pending' | 'available' | 'failed';
export type ArtifactSourceTool = 'write_file' | 'edit_file' | 'generated_output' | 'runtime_file_change';
export type ArtifactType = 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';

export interface AgentArtifact {
  id: string;
  runId: string;
  path: string;
  type: ArtifactType;
  status: ArtifactStatus;
  sourceTool: ArtifactSourceTool;
  sourceInvocationId?: string | null;
  backendArtifactId?: string | null;
  content?: string;
  url?: string | null;
  workspaceRoot?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentArtifactsState {
  artifactsByRun: Map<string, AgentArtifact[]>;
  latestVisibleArtifactIdByRun: Map<string, string | null>;
  latestVisibleArtifactVersionByRun: Map<string, number>;
}

type PersistedArtifactInput = {
  artifactId?: string | null;
  path: string;
  type?: ArtifactType | string;
  url?: string | null;
  workspaceRoot?: string | null;
  sourceTool?: ArtifactSourceTool;
};

const ARTIFACT_TYPES = new Set<ArtifactType>([
  'file',
  'image',
  'audio',
  'video',
  'pdf',
  'csv',
  'excel',
  'other',
]);

const nowIso = (): string => new Date().toISOString();
const normalizePath = (value: string): string => value.replace(/\\/g, '/').trim();
const buildArtifactId = (runId: string, filePath: string): string => `${runId}:${normalizePath(filePath)}`;

const normalizeArtifactType = (
  value?: ArtifactType | string | null,
  fallback: ArtifactType = 'other',
): ArtifactType => {
  if (!value) {
    return fallback;
  }
  return ARTIFACT_TYPES.has(value as ArtifactType) ? (value as ArtifactType) : fallback;
};

const ensureArtifacts = (state: AgentArtifactsState, runId: string): AgentArtifact[] => {
  if (!state.artifactsByRun.has(runId)) {
    state.artifactsByRun.set(runId, []);
  }
  return state.artifactsByRun.get(runId)!;
};

const announceLatestVisibleArtifact = (
  state: AgentArtifactsState,
  runId: string,
  artifactId: string,
): void => {
  state.latestVisibleArtifactIdByRun.set(runId, artifactId);
  const currentVersion = state.latestVisibleArtifactVersionByRun.get(runId) || 0;
  state.latestVisibleArtifactVersionByRun.set(runId, currentVersion + 1);
};

export const useAgentArtifactsStore = defineStore('agentArtifacts', {
  state: (): AgentArtifactsState => ({
    artifactsByRun: new Map(),
    latestVisibleArtifactIdByRun: new Map(),
    latestVisibleArtifactVersionByRun: new Map(),
  }),

  getters: {
    getArtifactsForRun: (state) => (runId: string) => state.artifactsByRun.get(runId) || [],
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
    markTouchedEntryAvailableFromArtifactPersisted(runId: string, input: PersistedArtifactInput) {
      const normalizedPath = normalizePath(input.path);
      if (!normalizedPath) {
        return null;
      }

      const artifactId = buildArtifactId(runId, normalizedPath);
      const artifacts = ensureArtifacts(this, runId);
      const existing = artifacts.find((artifact) => artifact.id === artifactId) || null;
      const timestamp = nowIso();

      if (existing) {
        existing.path = normalizedPath;
        existing.type = normalizeArtifactType(input.type, existing.type);
        existing.status = 'available';
        existing.sourceTool = input.sourceTool ?? existing.sourceTool;
        existing.backendArtifactId = input.artifactId ?? existing.backendArtifactId ?? null;
        existing.url = input.url ?? existing.url ?? null;
        existing.workspaceRoot = input.workspaceRoot ?? existing.workspaceRoot ?? null;
        existing.updatedAt = timestamp;
        return existing;
      }

      const artifact: AgentArtifact = {
        id: artifactId,
        runId,
        path: normalizedPath,
        type: normalizeArtifactType(input.type),
        status: 'available',
        sourceTool: input.sourceTool ?? 'generated_output',
        sourceInvocationId: null,
        backendArtifactId: input.artifactId ?? null,
        content: undefined,
        url: input.url ?? null,
        workspaceRoot: input.workspaceRoot ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      artifacts.push(artifact);
      announceLatestVisibleArtifact(this, runId, artifact.id);
      return artifact;
    },

    getArtifactById(runId: string, artifactId: string) {
      const artifacts = this.artifactsByRun.get(runId) || [];
      return artifacts.find((artifact) => artifact.id === artifactId) || null;
    },

    clearRun(runId: string) {
      this.artifactsByRun.delete(runId);
      this.latestVisibleArtifactIdByRun.delete(runId);
      this.latestVisibleArtifactVersionByRun.delete(runId);
    },
  },
});
