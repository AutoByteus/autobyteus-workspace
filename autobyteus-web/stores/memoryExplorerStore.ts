import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import {
  LIST_AGENTS_WITH_MEMORY,
  LIST_AGENT_RUNS_WITH_MEMORY,
  LIST_AGENT_TEAMS_WITH_MEMORY,
  LIST_AGENT_TEAM_RUNS_WITH_MEMORY,
  LIST_AGENT_ORGS_WITH_MEMORY,
  LIST_AGENT_ORG_RUNS_WITH_MEMORY,
  LIST_MEMORY_EXPLORER_SOURCES,
} from '~/graphql/queries/memoryExplorerQueries';
import type {
  AgentOrgRunMemorySummary,
  AgentOrgWithMemorySummary,
  AgentRunMemorySummary,
  AgentTeamRunMemorySummary,
  AgentTeamWithMemorySummary,
  AgentWithMemorySelector,
  AgentWithMemorySummary,
  MemoryExplorerPage,
  MemoryExplorerSourceInput,
  MemoryExplorerSourceOption,
} from '~/types/memory';

export type MemoryHomeTab = 'agents' | 'teams' | 'orgs';

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
type ListOrgsQuery = { listAgentOrgsWithMemory?: MemoryExplorerPage<AgentOrgWithMemorySummary> | null };
type ListOrgRunsQuery = { listAgentOrgRunsWithMemory?: MemoryExplorerPage<AgentOrgRunMemorySummary> | null };

type PageVariables = { source?: MemoryExplorerSourceInput | null; search?: string | null; page?: number; pageSize?: number };
type AgentRunsVariables = PageVariables & { selector: AgentWithMemorySelector };
type TeamRunsVariables = PageVariables & { teamDefinitionId: string };
type OrgRunsVariables = PageVariables & { orgDefinitionId: string };

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
  orgs: ListState<AgentOrgWithMemorySummary>;
  orgRuns: ListState<AgentOrgRunMemorySummary>;
  selectedAgent: AgentWithMemorySummary | null;
  selectedTeam: AgentTeamWithMemorySummary | null;
  selectedOrg: AgentOrgWithMemorySummary | null;
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

/** Clears a detail list when the selected agent, team or org changes, so another selection's runs never show. */
const resetList = <T>(state: ListState<T>) => {
  state.entries = [];
  state.total = 0;
  state.page = 1;
  state.totalPages = 1;
  state.search = '';
  state.error = null;
  state.requestId += 1;
};

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
    orgs: createListState<AgentOrgWithMemorySummary>(25),
    orgRuns: createListState<AgentOrgRunMemorySummary>(25),
    selectedAgent: null,
    selectedTeam: null,
    selectedOrg: null,
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
      this.clearSelections();
    },

    async fetchAgents(): Promise<MemoryExplorerPage<AgentWithMemorySummary> | null> {
      return await this.fetchList(this.agents, LIST_AGENTS_WITH_MEMORY, 'listAgentsWithMemory');
    },

    async fetchTeams(): Promise<MemoryExplorerPage<AgentTeamWithMemorySummary> | null> {
      return await this.fetchList(this.teams, LIST_AGENT_TEAMS_WITH_MEMORY, 'listAgentTeamsWithMemory');
    },

    async fetchOrgs(): Promise<MemoryExplorerPage<AgentOrgWithMemorySummary> | null> {
      return await this.fetchList(this.orgs, LIST_AGENT_ORGS_WITH_MEMORY, 'listAgentOrgsWithMemory');
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

    async fetchOrgRuns(orgDefinitionId: string): Promise<MemoryExplorerPage<AgentOrgRunMemorySummary> | null> {
      return await this.fetchList(
        this.orgRuns,
        LIST_AGENT_ORG_RUNS_WITH_MEMORY,
        'listAgentOrgRunsWithMemory',
        { orgDefinitionId },
      );
    },

    setSelectedAgentFromRoute(selector: AgentWithMemorySelector, displayName?: string | null) {
      const agentDefinitionId = selector.agentDefinitionId ?? null;
      const current = this.selectedAgent;
      if (!current || current.attribution !== selector.attribution || (current.agentDefinitionId ?? null) !== agentDefinitionId) {
        resetList(this.agentRuns);
      }
      this.clearSelections();
      this.selectedAgent = {
        attribution: selector.attribution,
        agentDefinitionId,
        displayName: displayName || (selector.attribution === 'UNATTRIBUTED' ? 'Unattributed runs' : selector.agentDefinitionId || 'Agent'),
        stableId: selector.agentDefinitionId || 'unattributed',
        runCount: this.agentRuns.total,
        latestMemoryAt: null,
        memory: this.emptyMemory(),
      };
    },

    setSelectedTeamFromRoute(teamDefinitionId: string, teamDefinitionName?: string | null) {
      if (this.selectedTeam?.teamDefinitionId !== teamDefinitionId) resetList(this.teamRuns);
      this.clearSelections();
      this.selectedTeam = {
        teamDefinitionId,
        teamDefinitionName: teamDefinitionName || teamDefinitionId,
        teamRunCount: this.teamRuns.total,
        memberMemoryCount: 0,
        latestMemoryAt: null,
        memory: this.emptyMemory(),
      };
    },

    setSelectedOrgFromRoute(orgDefinitionId: string, orgDefinitionName?: string | null) {
      if (this.selectedOrg?.orgDefinitionId !== orgDefinitionId) resetList(this.orgRuns);
      this.clearSelections();
      this.selectedOrg = {
        orgDefinitionId,
        orgDefinitionName: orgDefinitionName || orgDefinitionId,
        orgRunCount: this.orgRuns.total,
        memberMemoryCount: 0,
        latestMemoryAt: null,
        memory: this.emptyMemory(),
      };
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

    async setOrgsSearch(search: string) {
      this.orgs.search = search;
      this.orgs.page = 1;
      await this.fetchOrgs();
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

    async setOrgRunsSearch(orgDefinitionId: string, search: string) {
      this.orgRuns.search = search;
      this.orgRuns.page = 1;
      await this.fetchOrgRuns(orgDefinitionId);
    },

    async changeAgentRunsPage(selector: AgentWithMemorySelector, page: number) {
      this.agentRuns.page = Math.max(1, page);
      await this.fetchAgentRuns(selector);
    },

    async changeTeamRunsPage(teamDefinitionId: string, page: number) {
      this.teamRuns.page = Math.max(1, page);
      await this.fetchTeamRuns(teamDefinitionId);
    },

    async changeOrgRunsPage(orgDefinitionId: string, page: number) {
      this.orgRuns.page = Math.max(1, page);
      await this.fetchOrgRuns(orgDefinitionId);
    },

    async changeHomePage(tab: MemoryHomeTab, page: number) {
      if (tab === 'agents') {
        this.agents.page = Math.max(1, page);
        await this.fetchAgents();
      } else if (tab === 'teams') {
        this.teams.page = Math.max(1, page);
        await this.fetchTeams();
      } else {
        this.orgs.page = Math.max(1, page);
        await this.fetchOrgs();
      }
    },

    async fetchHomeTab(tab: MemoryHomeTab) {
      if (tab === 'agents') await this.fetchAgents();
      else if (tab === 'teams') await this.fetchTeams();
      else await this.fetchOrgs();
    },

    resetPagesForSourceChange() {
      this.agents.page = 1;
      this.agentRuns.page = 1;
      this.teams.page = 1;
      this.teamRuns.page = 1;
      this.orgs.page = 1;
      this.orgRuns.page = 1;
      this.clearSelections();
    },

    clearSelections() {
      this.selectedAgent = null;
      this.selectedTeam = null;
      this.selectedOrg = null;
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
        const { data, errors } = await getApolloClient().query<any, PageVariables | AgentRunsVariables | TeamRunsVariables | OrgRunsVariables>({
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
