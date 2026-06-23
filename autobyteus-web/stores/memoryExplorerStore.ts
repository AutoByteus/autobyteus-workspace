import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import {
  LIST_AGENTS_WITH_MEMORY,
  LIST_AGENT_RUNS_WITH_MEMORY,
  LIST_AGENT_TEAMS_WITH_MEMORY,
  LIST_AGENT_TEAM_RUNS_WITH_MEMORY,
  LIST_MEMORY_EXPLORER_SOURCES,
} from '~/graphql/queries/memoryExplorerQueries';
import type {
  AgentRunMemorySummary,
  AgentTeamRunMemorySummary,
  AgentTeamWithMemorySummary,
  AgentWithMemorySelector,
  AgentWithMemorySummary,
  MemoryExplorerPage,
  MemoryExplorerSourceInput,
  MemoryExplorerSourceOption,
} from '~/types/memory';

export type MemoryHomeTab = 'agents' | 'teams';

type ListState<T> = MemoryExplorerPage<T> & {
  search: string;
  loading: boolean;
  error: string | null;
  requestId: number;
};

type ListSourcesQuery = { listMemoryExplorerSources?: MemoryExplorerSourceOption[] | null };
type ListAgentsQuery = { listAgentsWithMemory?: MemoryExplorerPage<AgentWithMemorySummary> | null };
type ListAgentRunsQuery = { listAgentRunsWithMemory?: MemoryExplorerPage<AgentRunMemorySummary> | null };
type ListTeamsQuery = { listAgentTeamsWithMemory?: MemoryExplorerPage<AgentTeamWithMemorySummary> | null };
type ListTeamRunsQuery = { listAgentTeamRunsWithMemory?: MemoryExplorerPage<AgentTeamRunMemorySummary> | null };

type PageVariables = { source?: MemoryExplorerSourceInput | null; search?: string | null; page?: number; pageSize?: number };
type AgentRunsVariables = PageVariables & { selector: AgentWithMemorySelector };
type TeamRunsVariables = PageVariables & { teamDefinitionId: string };

interface MemoryExplorerState {
  homeTab: MemoryHomeTab;
  sources: MemoryExplorerSourceOption[];
  selectedSource: MemoryExplorerSourceOption;
  sourceLoading: boolean;
  sourceError: string | null;
  agents: ListState<AgentWithMemorySummary>;
  agentRuns: ListState<AgentRunMemorySummary>;
  teams: ListState<AgentTeamWithMemorySummary>;
  teamRuns: ListState<AgentTeamRunMemorySummary>;
  selectedAgent: AgentWithMemorySummary | null;
  selectedTeam: AgentTeamWithMemorySummary | null;
}

const localSource = (): MemoryExplorerSourceOption => ({
  key: 'local',
  type: 'LOCAL',
  label: 'Local Memory',
  sourceNodeId: null,
  displayName: null,
  readOnly: false,
  lastImportedAt: null,
  lastSyncStatus: null,
});

const createListState = <T>(pageSize: number): ListState<T> => ({
  entries: [],
  total: 0,
  page: 1,
  pageSize,
  totalPages: 1,
  search: '',
  loading: false,
  error: null,
  requestId: 0,
});

const applyPage = <T>(state: ListState<T>, payload: MemoryExplorerPage<T> | null | undefined) => {
  if (!payload) {
    state.entries = [];
    state.total = 0;
    state.totalPages = 1;
    return;
  }
  state.entries = payload.entries || [];
  state.total = payload.total ?? 0;
  state.page = payload.page ?? state.page;
  state.pageSize = payload.pageSize ?? state.pageSize;
  state.totalPages = payload.totalPages ?? 1;
};

const sourceInputFor = (source: MemoryExplorerSourceOption): MemoryExplorerSourceInput => (
  source.type === 'IMPORTED' && source.sourceNodeId
    ? { type: 'IMPORTED', sourceNodeId: source.sourceNodeId }
    : { type: 'LOCAL' }
);

export const useMemoryExplorerStore = defineStore('memoryExplorerStore', {
  state: (): MemoryExplorerState => ({
    homeTab: 'agents',
    sources: [localSource()],
    selectedSource: localSource(),
    sourceLoading: false,
    sourceError: null,
    agents: createListState<AgentWithMemorySummary>(25),
    agentRuns: createListState<AgentRunMemorySummary>(25),
    teams: createListState<AgentTeamWithMemorySummary>(25),
    teamRuns: createListState<AgentTeamRunMemorySummary>(25),
    selectedAgent: null,
    selectedTeam: null,
  }),

  getters: {
    selectedSourceInput(state): MemoryExplorerSourceInput {
      return sourceInputFor(state.selectedSource);
    },
    selectedSourceQueryValue(state): string | undefined {
      return state.selectedSource.type === 'IMPORTED' && state.selectedSource.sourceNodeId
        ? `imported:${state.selectedSource.sourceNodeId}`
        : undefined;
    },
    isImportedSource(state): boolean {
      return state.selectedSource.type === 'IMPORTED';
    },
  },

  actions: {
    async loadSources(): Promise<MemoryExplorerSourceOption[]> {
      this.sourceLoading = true;
      this.sourceError = null;
      try {
        const { data, errors } = await getApolloClient().query<ListSourcesQuery>({
          query: LIST_MEMORY_EXPLORER_SOURCES,
          fetchPolicy: 'network-only',
        });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        const sources = data?.listMemoryExplorerSources?.length ? data.listMemoryExplorerSources : [localSource()];
        this.sources = sources;
        if (!this.sources.some((source) => source.key === this.selectedSource.key)) {
          this.selectedSource = this.sources[0] || localSource();
        }
        return this.sources;
      } catch (error: any) {
        this.sourceError = error?.message || 'Failed to load memory sources.';
        this.sources = [localSource()];
        this.selectedSource = this.sources[0];
        return this.sources;
      } finally {
        this.sourceLoading = false;
      }
    },

    setSelectedSourceByKey(key?: string | null): boolean {
      const normalizedKey = key && key.trim() ? key.trim() : 'local';
      const source = this.sources.find((candidate) => candidate.key === normalizedKey);
      if (!source) {
        this.selectedSource = this.sources[0] || localSource();
        this.resetPagesForSourceChange();
        return false;
      }
      if (this.selectedSource.key !== source.key) {
        this.selectedSource = source;
        this.resetPagesForSourceChange();
      }
      return true;
    },

    setHomeTab(tab: MemoryHomeTab) {
      this.homeTab = tab;
      this.selectedAgent = null;
      this.selectedTeam = null;
    },

    async fetchAgents(): Promise<MemoryExplorerPage<AgentWithMemorySummary> | null> {
      return await this.fetchList(this.agents, LIST_AGENTS_WITH_MEMORY, 'listAgentsWithMemory');
    },

    async fetchTeams(): Promise<MemoryExplorerPage<AgentTeamWithMemorySummary> | null> {
      return await this.fetchList(this.teams, LIST_AGENT_TEAMS_WITH_MEMORY, 'listAgentTeamsWithMemory');
    },

    async fetchAgentRuns(selector: AgentWithMemorySelector): Promise<MemoryExplorerPage<AgentRunMemorySummary> | null> {
      return await this.fetchList(
        this.agentRuns,
        LIST_AGENT_RUNS_WITH_MEMORY,
        'listAgentRunsWithMemory',
        { selector },
      );
    },

    async fetchTeamRuns(teamDefinitionId: string): Promise<MemoryExplorerPage<AgentTeamRunMemorySummary> | null> {
      return await this.fetchList(
        this.teamRuns,
        LIST_AGENT_TEAM_RUNS_WITH_MEMORY,
        'listAgentTeamRunsWithMemory',
        { teamDefinitionId },
      );
    },

    async openAgentMemory(agent: AgentWithMemorySummary) {
      this.selectedAgent = agent;
      this.selectedTeam = null;
      this.agentRuns.search = '';
      this.agentRuns.page = 1;
      await this.fetchAgentRuns({ attribution: agent.attribution, agentDefinitionId: agent.agentDefinitionId ?? null });
    },

    async openTeamMemory(team: AgentTeamWithMemorySummary) {
      this.selectedTeam = team;
      this.selectedAgent = null;
      this.teamRuns.search = '';
      this.teamRuns.page = 1;
      await this.fetchTeamRuns(team.teamDefinitionId);
    },

    setSelectedAgentFromRoute(selector: AgentWithMemorySelector, displayName?: string | null) {
      this.selectedAgent = {
        attribution: selector.attribution,
        agentDefinitionId: selector.agentDefinitionId ?? null,
        displayName: displayName || (selector.attribution === 'UNATTRIBUTED' ? 'Unattributed runs' : selector.agentDefinitionId || 'Agent'),
        stableId: selector.agentDefinitionId || 'unattributed',
        runCount: this.agentRuns.total,
        latestMemoryAt: null,
        memory: this.emptyMemory(),
      };
      this.selectedTeam = null;
    },

    setSelectedTeamFromRoute(teamDefinitionId: string, teamDefinitionName?: string | null) {
      this.selectedTeam = {
        teamDefinitionId,
        teamDefinitionName: teamDefinitionName || teamDefinitionId,
        teamRunCount: this.teamRuns.total,
        memberMemoryCount: 0,
        latestMemoryAt: null,
        memory: this.emptyMemory(),
      };
      this.selectedAgent = null;
    },

    async setAgentsSearch(search: string) {
      this.agents.search = search;
      this.agents.page = 1;
      await this.fetchAgents();
    },

    async setTeamsSearch(search: string) {
      this.teams.search = search;
      this.teams.page = 1;
      await this.fetchTeams();
    },

    async setAgentRunsSearch(selector: AgentWithMemorySelector, search: string) {
      this.agentRuns.search = search;
      this.agentRuns.page = 1;
      await this.fetchAgentRuns(selector);
    },

    async setTeamRunsSearch(teamDefinitionId: string, search: string) {
      this.teamRuns.search = search;
      this.teamRuns.page = 1;
      await this.fetchTeamRuns(teamDefinitionId);
    },

    async changeAgentRunsPage(selector: AgentWithMemorySelector, page: number) {
      this.agentRuns.page = Math.max(1, page);
      await this.fetchAgentRuns(selector);
    },

    async changeTeamRunsPage(teamDefinitionId: string, page: number) {
      this.teamRuns.page = Math.max(1, page);
      await this.fetchTeamRuns(teamDefinitionId);
    },

    async changeHomePage(tab: MemoryHomeTab, page: number) {
      const state = tab === 'agents' ? this.agents : this.teams;
      state.page = Math.max(1, page);
      if (tab === 'agents') await this.fetchAgents();
      else await this.fetchTeams();
    },

    resetPagesForSourceChange() {
      this.agents.page = 1;
      this.agentRuns.page = 1;
      this.teams.page = 1;
      this.teamRuns.page = 1;
      this.selectedAgent = null;
      this.selectedTeam = null;
    },

    clearSelections() {
      this.selectedAgent = null;
      this.selectedTeam = null;
    },

    emptyMemory() {
      return {
        latestMemoryAt: null,
        hasWorkingContext: false,
        hasEpisodic: false,
        hasSemantic: false,
        hasRawTraces: false,
        hasRawArchive: false,
      };
    },

    async fetchList<T>(state: ListState<T>, query: any, dataKey: string, extraVariables: Record<string, unknown> = {}) {
      state.loading = true;
      state.error = null;
      const currentRequestId = ++state.requestId;
      try {
        const { data, errors } = await getApolloClient().query<any, PageVariables | AgentRunsVariables | TeamRunsVariables>({
          query,
          variables: {
            ...extraVariables,
            source: this.selectedSourceInput,
            search: state.search || null,
            page: state.page,
            pageSize: state.pageSize,
          },
          fetchPolicy: 'network-only',
        });
        if (errors?.length) throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        if (currentRequestId !== state.requestId) return null;
        const payload = data?.[dataKey] as MemoryExplorerPage<T> | undefined;
        applyPage(state, payload);
        return payload ?? null;
      } catch (error: any) {
        if (currentRequestId === state.requestId) state.error = error?.message || 'Failed to fetch memory explorer data.';
        return null;
      } finally {
        if (currentRequestId === state.requestId) state.loading = false;
      }
    },
  },
});
