import { defineStore } from 'pinia';

export type ArtifactStatus = 'streaming' | 'pending' | 'available' | 'failed';
export type ArtifactSourceTool = 'write_file' | 'edit_file' | 'generated_output' | 'runtime_file_change';
export type ArtifactType = 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';

type ArtifactAvailability = Exclude<ArtifactStatus, 'streaming'>;

export interface AgentArtifact {
  id: string; // Stable ID derived from runId:path
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
  activeStreamingArtifactByRun: Map<string, AgentArtifact | null>;
  latestVisibleArtifactIdByRun: Map<string, string | null>;
  latestVisibleArtifactVersionByRun: Map<string, number>;
}

type SegmentStartArtifactInput = {
  invocationId: string;
  path: string;
  type?: ArtifactType;
  sourceTool: Extract<ArtifactSourceTool, 'write_file' | 'edit_file'>;
};

type ArtifactProjectionInput = {
  path: string;
  type?: ArtifactType | string;
  artifactId?: string | null;
  workspaceRoot?: string | null;
  url?: string | null;
  sourceTool?: ArtifactSourceTool;
};

type LifecycleFallbackInput = {
  path: string;
  type?: ArtifactType | string;
  sourceTool: Extract<ArtifactSourceTool, 'write_file' | 'edit_file'>;
  status: ArtifactAvailability;
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

const normalizePath = (path: string): string => path.replace(/\\/g, '/').trim();

const buildArtifactId = (runId: string, path: string): string => `${runId}:${normalizePath(path)}`;

const buildInvocationAliases = (invocationId: string): string[] => {
  const trimmed = invocationId.trim();
  if (!trimmed) {
    return [];
  }

  const aliases = [trimmed];
  if (trimmed.includes(':')) {
    const base = trimmed.split(':')[0]?.trim();
    if (base && !aliases.includes(base)) {
      aliases.push(base);
    }
  }

  return aliases;
};

const invocationIdsMatch = (left?: string | null, right?: string | null): boolean => {
  if (!left || !right) {
    return false;
  }

  const leftAliases = buildInvocationAliases(left);
  const rightAliases = buildInvocationAliases(right);
  return leftAliases.some((alias) => rightAliases.includes(alias));
};

const normalizeArtifactType = (
  value?: ArtifactType | string | null,
  fallback: ArtifactType = 'file',
): ArtifactType => {
  if (!value) {
    return fallback;
  }

  return ARTIFACT_TYPES.has(value as ArtifactType) ? (value as ArtifactType) : fallback;
};

const getInitialStatusForSegment = (
  sourceTool: SegmentStartArtifactInput['sourceTool'],
): ArtifactStatus => (sourceTool === 'write_file' ? 'streaming' : 'pending');

type ProjectionUpsertPolicy = {
  statusOnCreate: ArtifactAvailability;
  statusOnExisting: (artifact: AgentArtifact) => ArtifactAvailability;
  sourceToolOnCreate: ArtifactSourceTool;
  sourceToolOnExisting?: (artifact: AgentArtifact) => ArtifactSourceTool;
  announceOnCreate: boolean;
};

const ensureArtifacts = (state: AgentArtifactsState, runId: string): AgentArtifact[] => {
  if (!state.artifactsByRun.has(runId)) {
    state.artifactsByRun.set(runId, []);
  }
  return state.artifactsByRun.get(runId)!;
};

const findArtifactById = (artifacts: AgentArtifact[], artifactId: string): AgentArtifact | null =>
  artifacts.find((artifact) => artifact.id === artifactId) || null;

const findArtifactByInvocationId = (
  artifacts: AgentArtifact[],
  invocationId: string,
): AgentArtifact | null =>
  artifacts.find((artifact) => invocationIdsMatch(artifact.sourceInvocationId, invocationId)) || null;

const announceLatestVisibleArtifact = (
  state: AgentArtifactsState,
  runId: string,
  artifactId: string,
): void => {
  state.latestVisibleArtifactIdByRun.set(runId, artifactId);
  const currentVersion = state.latestVisibleArtifactVersionByRun.get(runId) || 0;
  state.latestVisibleArtifactVersionByRun.set(runId, currentVersion + 1);
};

const updateArtifactLifecycleByInvocation = (
  state: AgentArtifactsState,
  runId: string,
  invocationId: string,
  updates: {
    status: ArtifactAvailability;
    type?: ArtifactType | string;
    workspaceRoot?: string | null;
    url?: string | null;
    backendArtifactId?: string | null;
    sourceTool?: ArtifactSourceTool;
  },
): AgentArtifact | null => {
  const artifacts = state.artifactsByRun.get(runId) || [];
  const artifact = findArtifactByInvocationId(artifacts, invocationId);
  if (!artifact) {
    return null;
  }

  artifact.status = updates.status;
  artifact.type = normalizeArtifactType(updates.type, artifact.type);
  artifact.workspaceRoot = updates.workspaceRoot !== undefined ? updates.workspaceRoot : artifact.workspaceRoot;
  artifact.url = updates.url !== undefined ? updates.url : artifact.url;
  artifact.backendArtifactId = updates.backendArtifactId ?? artifact.backendArtifactId ?? null;
  artifact.sourceTool = updates.sourceTool ?? artifact.sourceTool;
  artifact.updatedAt = nowIso();

  if (state.activeStreamingArtifactByRun.get(runId)?.id === artifact.id) {
    state.activeStreamingArtifactByRun.set(runId, null);
  }

  return artifact;
};

const upsertTouchedEntryProjection = (
  state: AgentArtifactsState,
  runId: string,
  input: ArtifactProjectionInput,
  policy: ProjectionUpsertPolicy,
): AgentArtifact | null => {
  const normalizedPath = normalizePath(input.path);
  if (!normalizedPath) {
    return null;
  }

  const artifactId = buildArtifactId(runId, normalizedPath);
  const artifacts = ensureArtifacts(state, runId);
  const artifact = findArtifactById(artifacts, artifactId);
  const timestamp = nowIso();

  if (artifact) {
    const nextStatus = policy.statusOnExisting(artifact);
    artifact.path = normalizedPath;
    artifact.type = normalizeArtifactType(input.type, artifact.type);
    artifact.status = nextStatus;
    artifact.sourceTool = policy.sourceToolOnExisting?.(artifact) ?? artifact.sourceTool;
    artifact.backendArtifactId = input.artifactId ?? artifact.backendArtifactId ?? null;
    artifact.workspaceRoot = input.workspaceRoot !== undefined ? input.workspaceRoot : artifact.workspaceRoot;
    artifact.url = input.url !== undefined ? input.url : artifact.url;
    artifact.updatedAt = timestamp;

    if (state.activeStreamingArtifactByRun.get(runId)?.id === artifact.id && nextStatus !== 'streaming') {
      state.activeStreamingArtifactByRun.set(runId, null);
    }

    return artifact;
  }

  const newArtifact: AgentArtifact = {
    id: artifactId,
    runId,
    path: normalizedPath,
    type: normalizeArtifactType(input.type),
    status: policy.statusOnCreate,
    sourceTool: policy.sourceToolOnCreate,
    sourceInvocationId: null,
    backendArtifactId: input.artifactId ?? null,
    content: undefined,
    url: input.url ?? null,
    workspaceRoot: input.workspaceRoot ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  artifacts.push(newArtifact);
  if (policy.announceOnCreate) {
    announceLatestVisibleArtifact(state, runId, newArtifact.id);
  }
  return newArtifact;
};

export const useAgentArtifactsStore = defineStore('agentArtifacts', {
  state: (): AgentArtifactsState => ({
    artifactsByRun: new Map(),
    activeStreamingArtifactByRun: new Map(),
    latestVisibleArtifactIdByRun: new Map(),
    latestVisibleArtifactVersionByRun: new Map(),
  }),

  getters: {
    getArtifactsForRun: (state) => (runId: string) => state.artifactsByRun.get(runId) || [],
    getActiveStreamingArtifactForRun: (state) => (runId: string) => state.activeStreamingArtifactByRun.get(runId) || null,
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
    upsertTouchedEntryFromSegmentStart(runId: string, input: SegmentStartArtifactInput) {
      const normalizedPath = normalizePath(input.path);
      if (!normalizedPath) {
        return null;
      }

      const artifactId = buildArtifactId(runId, normalizedPath);
      const artifacts = ensureArtifacts(this, runId);
      const artifact = findArtifactById(artifacts, artifactId);
      const timestamp = nowIso();
      const nextStatus = getInitialStatusForSegment(input.sourceTool);

      if (artifact) {
        artifact.path = normalizedPath;
        artifact.type = input.type ?? artifact.type;
        artifact.status = nextStatus;
        artifact.sourceTool = input.sourceTool;
        artifact.sourceInvocationId = input.invocationId;
        artifact.updatedAt = timestamp;

        if (input.sourceTool === 'write_file') {
          artifact.content = '';
          this.activeStreamingArtifactByRun.set(runId, artifact);
        } else if (this.activeStreamingArtifactByRun.get(runId)?.id === artifact.id) {
          this.activeStreamingArtifactByRun.set(runId, null);
        }

        announceLatestVisibleArtifact(this, runId, artifact.id);
        return artifact;
      }

      const newArtifact: AgentArtifact = {
        id: artifactId,
        runId,
        path: normalizedPath,
        type: input.type ?? 'file',
        status: nextStatus,
        sourceTool: input.sourceTool,
        sourceInvocationId: input.invocationId,
        backendArtifactId: null,
        content: input.sourceTool === 'write_file' ? '' : undefined,
        url: null,
        workspaceRoot: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      artifacts.push(newArtifact);
      if (input.sourceTool === 'write_file') {
        this.activeStreamingArtifactByRun.set(runId, newArtifact);
      }
      announceLatestVisibleArtifact(this, runId, newArtifact.id);
      return newArtifact;
    },

    appendArtifactContent(runId: string, delta: string) {
      const artifact = this.activeStreamingArtifactByRun.get(runId);
      if (!artifact || artifact.status !== 'streaming') {
        return;
      }

      artifact.content = (artifact.content || '') + delta;
      artifact.updatedAt = nowIso();
    },

    markTouchedEntryPending(runId: string, invocationId: string) {
      return updateArtifactLifecycleByInvocation(this, runId, invocationId, {
        status: 'pending',
      });
    },

    markTouchedEntryAvailableByInvocation(
      runId: string,
      invocationId: string,
      updates: {
        type?: ArtifactType | string;
        workspaceRoot?: string | null;
        url?: string | null;
        backendArtifactId?: string | null;
        sourceTool?: ArtifactSourceTool;
      } = {},
    ) {
      return updateArtifactLifecycleByInvocation(this, runId, invocationId, {
        status: 'available',
        type: updates.type,
        workspaceRoot: updates.workspaceRoot,
        url: updates.url,
        backendArtifactId: updates.backendArtifactId,
        sourceTool: updates.sourceTool,
      });
    },

    markTouchedEntryFailedByInvocation(runId: string, invocationId: string) {
      return updateArtifactLifecycleByInvocation(this, runId, invocationId, {
        status: 'failed',
      });
    },

    refreshTouchedEntryFromArtifactUpdate(runId: string, input: ArtifactProjectionInput) {
      return upsertTouchedEntryProjection(this, runId, input, {
        statusOnCreate: 'pending',
        statusOnExisting: (artifact) =>
          artifact.status === 'streaming' ? 'streaming' : (artifact.status as ArtifactAvailability),
        sourceToolOnCreate: input.sourceTool ?? 'runtime_file_change',
        sourceToolOnExisting: (artifact) => input.sourceTool ?? artifact.sourceTool,
        announceOnCreate: true,
      });
    },

    markTouchedEntryAvailableFromArtifactPersisted(runId: string, input: ArtifactProjectionInput) {
      return upsertTouchedEntryProjection(this, runId, input, {
        statusOnCreate: 'available',
        statusOnExisting: () => 'available',
        sourceToolOnCreate: input.sourceTool ?? 'runtime_file_change',
        sourceToolOnExisting: (artifact) => input.sourceTool ?? artifact.sourceTool,
        announceOnCreate: true,
      });
    },

    ensureTouchedEntryTerminalStateFromLifecycle(
      runId: string,
      input: LifecycleFallbackInput,
    ) {
      return upsertTouchedEntryProjection(this, runId, input, {
        statusOnCreate: input.status,
        statusOnExisting: () => input.status,
        sourceToolOnCreate: input.sourceTool,
        sourceToolOnExisting: () => input.sourceTool,
        announceOnCreate: true,
      });
    },

    getArtifactById(runId: string, artifactId: string) {
      const artifacts = this.artifactsByRun.get(runId) || [];
      return findArtifactById(artifacts, artifactId);
    },

    clearLatestVisibleArtifact(runId: string) {
      this.latestVisibleArtifactIdByRun.set(runId, null);
    },
  },
});
