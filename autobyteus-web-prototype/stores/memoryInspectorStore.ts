import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_AGENT_RUN_MEMORY_VIEW, GET_TEAM_MEMBER_RUN_MEMORY_VIEW } from '~/graphql/queries/memoryViewQueries';
import type { MemoryExplorerSourceInput, MemoryInspectTarget, MemoryInspectorTab, RunMemoryView } from '~/types/memory';

type AgentRunMemoryViewQuery = { getAgentRunMemoryView?: RunMemoryView | null };
type TeamMemberRunMemoryViewQuery = { getTeamMemberRunMemoryView?: RunMemoryView | null };

type ViewVariables = {
  runId?: string;
  teamRunId?: string;
  agentRunId?: string;
  source?: MemoryExplorerSourceInput;
  includeWorkingContext?: boolean;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
  includeRawTraces?: boolean;
  includeRawTraceFiles?: boolean;
  includeArchive?: boolean;
  rawTraceLimit?: number;
  rawTraceFileName?: string | null;
};

interface MemoryInspectorState {
  target: MemoryInspectTarget | null;
  memoryView: RunMemoryView | null;
  activeTab: MemoryInspectorTab;
  rawTraceLimit: number;
  includeRawTraces: boolean;
  selectedRawTraceFileName: string | null;
  loading: boolean;
  error: string | null;
  requestId: number;
}

const sourceKey = (source?: MemoryExplorerSourceInput | null): string => (
  source?.type === 'IMPORTED' && source.sourceNodeId ? `imported:${source.sourceNodeId}` : 'local'
);

const sameTarget = (a: MemoryInspectTarget | null, b: MemoryInspectTarget): boolean => {
  if (!a || a.kind !== b.kind || sourceKey(a.source) !== sourceKey(b.source)) return false;
  if (a.kind === 'agent_run' && b.kind === 'agent_run') return a.runId === b.runId;
  if (a.kind === 'team_member_run' && b.kind === 'team_member_run') {
    return a.teamRunId === b.teamRunId && a.agentRunId === b.agentRunId;
  }
  return false;
};

export const useMemoryInspectorStore = defineStore('memoryInspectorStore', {
  state: (): MemoryInspectorState => ({
    target: null,
    memoryView: null,
    activeTab: 'working',
    rawTraceLimit: 500,
    includeRawTraces: false,
    selectedRawTraceFileName: null,
    loading: false,
    error: null,
    requestId: 0,
  }),

  actions: {
    async inspect(target: MemoryInspectTarget): Promise<RunMemoryView | null> {
      if (!sameTarget(this.target, target)) {
        this.memoryView = null;
        this.activeTab = 'working';
        this.includeRawTraces = false;
        this.selectedRawTraceFileName = null;
      }
      this.target = target;
      return await this.fetchMemoryView();
    },

    async setActiveTab(tab: MemoryInspectorTab) {
      this.activeTab = tab;
      if (tab === 'raw' && !this.includeRawTraces) {
        this.includeRawTraces = true;
        await this.fetchMemoryView();
      }
    },

    async setRawTraceLimit(limit: number) {
      this.rawTraceLimit = limit;
      if (this.includeRawTraces) await this.fetchMemoryView();
    },

    async setRawTraceFileName(fileName: string) {
      if (!fileName || this.selectedRawTraceFileName === fileName) return;
      this.selectedRawTraceFileName = fileName;
      if (this.includeRawTraces) await this.fetchMemoryView();
    },

    async fetchMemoryView(): Promise<RunMemoryView | null> {
      if (!this.target) return null;
      this.loading = true;
      this.error = null;
      const currentRequestId = ++this.requestId;
      try {
        const query = this.target.kind === 'agent_run' ? GET_AGENT_RUN_MEMORY_VIEW : GET_TEAM_MEMBER_RUN_MEMORY_VIEW;
        const variables = this.buildVariables(this.target);
        const { data, errors } = await getApolloClient().query<AgentRunMemoryViewQuery | TeamMemberRunMemoryViewQuery, ViewVariables>({
          query,
          variables,
          fetchPolicy: 'network-only',
        });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        if (currentRequestId !== this.requestId) return null;
        const payload = this.target.kind === 'agent_run'
          ? (data as AgentRunMemoryViewQuery)?.getAgentRunMemoryView
          : (data as TeamMemberRunMemoryViewQuery)?.getTeamMemberRunMemoryView;
        if (payload) {
          this.memoryView = payload;
          if (this.includeRawTraces) {
            this.selectedRawTraceFileName = payload.selectedRawTraceFileName ?? null;
          }
        }
        return payload ?? null;
      } catch (error: any) {
        if (currentRequestId === this.requestId) this.error = error?.message || 'Failed to fetch memory view.';
        return null;
      } finally {
        if (currentRequestId === this.requestId) this.loading = false;
      }
    },

    buildVariables(target: MemoryInspectTarget): ViewVariables {
      const common = {
        source: target.source ?? { type: 'LOCAL' as const },
        includeWorkingContext: true,
        includeEpisodic: true,
        includeSemantic: true,
        includeRawTraces: this.includeRawTraces,
        includeRawTraceFiles: this.includeRawTraces,
        includeArchive: false,
        rawTraceLimit: this.rawTraceLimit,
        rawTraceFileName: this.includeRawTraces ? this.selectedRawTraceFileName : null,
      };
      if (target.kind === 'agent_run') return { ...common, runId: target.runId };
      return { ...common, teamRunId: target.teamRunId, agentRunId: target.agentRunId };
    },

    clear() {
      this.target = null;
      this.memoryView = null;
      this.error = null;
      this.includeRawTraces = false;
      this.selectedRawTraceFileName = null;
      this.activeTab = 'working';
    },
  },
});
