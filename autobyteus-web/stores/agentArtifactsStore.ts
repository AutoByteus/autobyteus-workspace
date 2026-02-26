import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GetAgentArtifacts } from '~/graphql/queries/agentArtifactQueries';

export type ArtifactStatus = 'streaming' | 'pending_approval' | 'persisted' | 'failed';

export interface AgentArtifact {
  id: string; // Unique ID (UUID or Path for streaming)
  runId: string;
  path: string; // Relative path (e.g., "src/hello.py")
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  status: ArtifactStatus;
  content?: string; // Content buffer for text files
  url?: string; // URL for media files
  workspaceRoot?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentArtifactsState {
  // Map of RunID -> Artifact[]
  artifactsByRun: Map<string, AgentArtifact[]>;
  // Map of RunID -> Pending Artifact (Only one active at a time usually)
  activeStreamingArtifactByRun: Map<string, AgentArtifact | null>;
}

type AgentArtifactsQueryResult = {
  agentArtifacts: Array<{
    id: string;
    runId: string;
    path: string;
    type: string;
    workspaceRoot?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export const useAgentArtifactsStore = defineStore('agentArtifacts', {
  state: (): AgentArtifactsState => ({
    artifactsByRun: new Map(),
    activeStreamingArtifactByRun: new Map(),
  }),

  getters: {
    getArtifactsForRun: (state) => (runId: string) => {
      return state.artifactsByRun.get(runId) || [];
    },
    getActiveStreamingArtifactForRun: (state) => (runId: string) => {
      return state.activeStreamingArtifactByRun.get(runId) || null;
    },
  },

  actions: {
    /**
     * Start streaming a new artifact (e.g. write_file start)
     * If an artifact with the same path already exists for this run,
     * it will be updated (reset to streaming) instead of creating a duplicate.
     */
    createPendingArtifact(runId: string, path: string, type: 'file' | 'image' = 'file') {
      // Check if an artifact with the same path already exists
      const existingArtifacts = this.artifactsByRun.get(runId) || [];
      const existingArtifact = existingArtifacts.find(a => a.path === path);

      if (existingArtifact) {
        // Update existing artifact - reset for new streaming session
        existingArtifact.status = 'streaming';
        existingArtifact.content = '';
        const now = new Date().toISOString();
        existingArtifact.createdAt = now;
        existingArtifact.updatedAt = now;
        this.activeStreamingArtifactByRun.set(runId, existingArtifact);
        return;
      }

      // Create new artifact
      const artifact: AgentArtifact = {
        id: `pending-${Date.now()}`, // Temp ID
        runId,
        path,
        type,
        status: 'streaming',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Set as active streaming
      this.activeStreamingArtifactByRun.set(runId, artifact);
      
      // Add to list immediately so it shows up
      if (!this.artifactsByRun.has(runId)) {
        this.artifactsByRun.set(runId, []);
      }
      this.artifactsByRun.get(runId)?.push(artifact);
      
      // OPTIONAL: Trigger side-effect to switch tabs (handled by component or handler)
    },

    /**
     * Append content to the current streaming artifact
     */
    appendArtifactContent(runId: string, delta: string) {
      const artifact = this.activeStreamingArtifactByRun.get(runId);
      if (artifact && artifact.status === 'streaming') {
        artifact.content = (artifact.content || '') + delta;
        artifact.updatedAt = new Date().toISOString();
      }
    },

    /**
     * Mark the artifact as fully streamed and waiting for approval
     */
    finalizeArtifactStream(runId: string) {
      const artifact = this.activeStreamingArtifactByRun.get(runId);
      if (artifact) {
        artifact.status = 'pending_approval';
        artifact.updatedAt = new Date().toISOString();
        // Clear active streamer so we don't accidentally append to it later
        this.activeStreamingArtifactByRun.set(runId, null);
      }
    },

    /**
     * Mark artifact as persisted (Tool was approved and executed)
     * This might be called by a separate event or optimistic update
     */
    markArtifactPersisted(runId: string, path: string, workspaceRoot?: string | null) {
        const artifacts = this.artifactsByRun.get(runId) || [];
        // Find the pending one matching path
        const artifact = artifacts.find(a => a.path === path && a.status === 'pending_approval');
        if (artifact) {
            artifact.status = 'persisted';
            artifact.updatedAt = new Date().toISOString();
            if (workspaceRoot !== undefined) {
              artifact.workspaceRoot = workspaceRoot;
            }
        }
    },

    /**
     * Create a media artifact directly (for image/audio files that don't stream).
     * These are created as 'persisted' immediately since the file already exists.
     */
    createMediaArtifact(artifact: Omit<AgentArtifact, 'status' | 'createdAt' | 'updatedAt'> & { timestamp?: string }) {
      const timestamp = artifact.timestamp || new Date().toISOString();
      const newArtifact: AgentArtifact = {
        ...artifact,
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'persisted',
      };

      if (!this.artifactsByRun.has(artifact.runId)) {
        this.artifactsByRun.set(artifact.runId, []);
      }
      this.artifactsByRun.get(artifact.runId)?.push(newArtifact);
    },
    
    /**
     * Mark artifact as failed/cancelled
     */
    markArtifactFailed(runId: string, path: string) {
        const artifacts = this.artifactsByRun.get(runId) || [];
        const artifact = artifacts.find(a => a.path === path && a.status === 'pending_approval');
        if (artifact) {
            artifact.status = 'failed';
            artifact.updatedAt = new Date().toISOString();
        }
    },

    /**
     * Touch an existing artifact to trigger refreshes (e.g., edit_file updates).
     * Creates a persisted artifact if none exists yet.
     */
    touchArtifact(
      runId: string,
      path: string,
      type: AgentArtifact['type'] = 'file',
      artifactId?: string,
      workspaceRoot?: string | null
    ) {
      const artifacts = this.artifactsByRun.get(runId) || [];
      const artifact = artifacts.find(a => a.path === path || (artifactId && a.id === artifactId));
      const now = new Date().toISOString();

      if (artifact) {
        artifact.updatedAt = now;
        if (workspaceRoot !== undefined) {
          artifact.workspaceRoot = workspaceRoot;
        }
        return;
      }

      const newArtifact: AgentArtifact = {
        id: artifactId || `artifact-${Date.now()}`,
        runId,
        path,
        type,
        status: 'persisted',
        workspaceRoot: workspaceRoot ?? null,
        createdAt: now,
        updatedAt: now,
      };

      if (!this.artifactsByRun.has(runId)) {
        this.artifactsByRun.set(runId, []);
      }
      this.artifactsByRun.get(runId)?.push(newArtifact);
    },

    /**
     * Fetch persisted artifacts from the backend for a run.
     * Use this when loading a previous session or restoring state after page refresh.
     * Not actively used yet - ready for future session restoration feature.
     */
    async fetchArtifactsForRun(runId: string) {
      try {
        const apolloClient = getApolloClient();
        const { data } = await apolloClient.query<AgentArtifactsQueryResult>({
          query: GetAgentArtifacts,
          variables: { runId },
          fetchPolicy: 'network-only',
        });

        if (data?.agentArtifacts) {
          const artifacts: AgentArtifact[] = data.agentArtifacts.map((a) => ({
            id: a.id,
            runId: a.runId,
            path: a.path,
            type: a.type as 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other',
            status: 'persisted' as ArtifactStatus, // Backend only stores persisted artifacts
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            workspaceRoot: a.workspaceRoot ?? null,
          }));
          this.artifactsByRun.set(runId, artifacts);
        }
      } catch (error) {
        console.error('Failed to fetch artifacts for run:', runId, error);
      }
    },
  },
});
