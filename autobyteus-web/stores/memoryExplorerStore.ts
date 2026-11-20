import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import {
  LIST_AGENTS_WITH_MEMORY,
  LIST_AGENT_EPISODES,
  LIST_AGENT_TEAMS_WITH_MEMORY,
  LIST_AGENT_TEAM_RUNS_WITH_MEMORY,
  LIST_AGENT_ORGS_WITH_MEMORY,
  LIST_AGENT_ORG_RUNS_WITH_MEMORY,
  LIST_MEMORY_EXPLORER_SOURCES,
  LIST_MEMORY_GROUP_MEMBERS,
} from '~/graphql/queries/memoryExplorerQueries';
import type {
  AgentEpisode,
  AgentOrgRunMemorySummary,
  AgentOrgWithMemorySummary,
  AgentTeamRunMemorySummary,
  AgentTeamWithMemorySummary,
  AgentWithMemorySelector,
  AgentWithMemorySummary,
  MemoryExplorerPage,
  MemoryExplorerSourceInput,
  MemoryExplorerSourceOption,
  MemoryGroupKind,
  MemoryGroupMember,
} from '~/types/memory';

type ListState<T> = MemoryExplorerPage<T> & {
  search: string;
  loading: boolean;
  error: string | null;
  requestId: number;
};

/** A team's or org's members on its page; `key` names whose they are (`TEAM:<id>` or `ORG:<id>`). */
interface MembersState {
  key: string | null;
  entries: MemoryGroupMember[];
  loading: boolean;
  error: string | null;
  requestId: number;
}

/** Where an agent works, for its page's subtitle: a team or org whose definition (or newest run) names it. */
export interface AgentPlace {
  kind: MemoryGroupKind;
  id: string;
  name: string;
  /** The agent is local to this team (team-local), not a shared agent. */
  local: boolean;
}

type ListSourcesQuery = { listMemoryExplorerSources?: MemoryExplorerSourceOption[] | null };
type ListMembersQuery = { listMemoryGroupMembers?: MemoryGroupMember[] | null };
type PageVariables = { source?: MemoryExplorerSourceInput | null; search?: string | null; page?: number; pageSize?: number };

interface MemoryExplorerState {
  sources: MemoryExplorerSourceOption[];
  selectedSource: MemoryExplorerSourceOption;
  /** True once a sources request has succeeded; the list is page-lifetime state. */
  sourcesLoaded: boolean;
  sourceLoading: boolean;
  sourceError: string | null;
  /** The source whose owners (the Browse cards) are loaded; null until the first load. */
  ownersSourceKey: string | null;
  agents: ListState<AgentWithMemorySummary>;
  teams: ListState<AgentTeamWithMemorySummary>;
  orgs: ListState<AgentOrgWithMemorySummary>;
  /** One agent's episodes; `ownerKey` names whose (`DEFINITION:<id>` or `UNATTRIBUTED`). */
  episodes: ListState<AgentEpisode> & { ownerKey: string | null };
  members: MembersState;
  /** Every team's and org's members loaded so far for the selected source, by `TEAM:<id>` / `ORG:<id>`. */
  groupMembers: Record<string, MemoryGroupMember[]>;
  teamRuns: ListState<AgentTeamRunMemorySummary>;
  orgRuns: ListState<AgentOrgRunMemorySummary>;
  selectedTeam: AgentTeamWithMemorySummary | null;
  selectedOrg: AgentOrgWithMemorySummary | null;
}

/** Browse shows every owner of a kind as cards with no paging: a node holds few agents, teams and orgs. */
const OWNERS_PAGE_SIZE = 500;
const EPISODES_PAGE_SIZE = 24;

const localSource = (): MemoryExplorerSourceOption => ({
  key: 'local',
  type: 'LOCAL',
  label: 'Local Memory',
  memorySyncSourceId: null,
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

/** Clears a list when its owner changes, so another owner's entries never show. */
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
  source.type === 'IMPORTED' && source.memorySyncSourceId
    ? { type: 'IMPORTED', memorySyncSourceId: source.memorySyncSourceId }
    : { type: 'LOCAL' }
);

export const episodesOwnerKey = (selector: AgentWithMemorySelector): string =>
  selector.attribution === 'UNATTRIBUTED' ? 'UNATTRIBUTED' : `DEFINITION:${selector.agentDefinitionId ?? ''}`;
export const groupMembersKey = (kind: MemoryGroupKind, definitionId: string): string => `${kind}:${definitionId}`;

const errorMessage = (errors: ReadonlyArray<{ message: string }>) => errors.map((e) => e.message).join(', ');

/** In-flight sources request per store instance, so concurrent `loadSources()` calls share one request. */
const sourcesRequests = new WeakMap<object, Promise<MemoryExplorerSourceOption[]>>();

/**
 * The Memory page's Browse, organised by owner (autobyteus-554, UI/UX spec): the Agents, Agent Teams and Agent Orgs
 * cards, one agent's episodes (its runs from every place it works), a team's or org's members, and their runs.
 */
export const useMemoryExplorerStore = defineStore('memoryExplorerStore', {
  state: (): MemoryExplorerState => ({
    sources: [localSource()],
    selectedSource: localSource(),
    sourcesLoaded: false,
    sourceLoading: false,
    sourceError: null,
    ownersSourceKey: null,
    agents: createListState<AgentWithMemorySummary>(OWNERS_PAGE_SIZE),
    teams: createListState<AgentTeamWithMemorySummary>(OWNERS_PAGE_SIZE),
    orgs: createListState<AgentOrgWithMemorySummary>(OWNERS_PAGE_SIZE),
    episodes: { ...createListState<AgentEpisode>(EPISODES_PAGE_SIZE), ownerKey: null },
    members: { key: null, entries: [], loading: false, error: null, requestId: 0 },
    groupMembers: {},
    teamRuns: createListState<AgentTeamRunMemorySummary>(25),
    orgRuns: createListState<AgentOrgRunMemorySummary>(25),
    selectedTeam: null,
    selectedOrg: null,
  }),

  getters: {
    selectedSourceInput(state): MemoryExplorerSourceInput {
      return sourceInputFor(state.selectedSource);
    },
    selectedSourceQueryValue(state): string | undefined {
      return state.selectedSource.type === 'IMPORTED' && state.selectedSource.memorySyncSourceId
        ? `imported:${state.selectedSource.memorySyncSourceId}`
        : undefined;
    },
    isImportedSource(state): boolean {
      return state.selectedSource.type === 'IMPORTED';
    },
    ownersLoading(state): boolean {
      return state.agents.loading || state.teams.loading || state.orgs.loading;
    },
    ownersError(state): string | null {
      return state.agents.error || state.teams.error || state.orgs.error;
    },
    /** The teams and orgs an agent is a member of, from the members loaded so far (`loadAllGroupMembers`). */
    placesOf(state) {
      return (agentDefinitionId: string): AgentPlace[] => {
        const places: AgentPlace[] = [];
        const add = (kind: MemoryGroupKind, id: string, name: string) => {
          const member = state.groupMembers[groupMembersKey(kind, id)]?.find((entry) => entry.kind === 'AGENT' && entry.id === agentDefinitionId);
          if (member) places.push({ kind, id, name, local: !member.shared });
        };
        for (const team of state.teams.entries) add('TEAM', team.teamDefinitionId, team.teamDefinitionName);
        for (const org of state.orgs.entries) add('ORG', org.orgDefinitionId, org.orgDefinitionName);
        return places;
      };
    },
  },

  actions: {
    /**
     * Replaces the sources list only; the selected source is derived from the route by the page. Concurrent calls
     * share one request. A failure keeps the previously loaded list (Local only if nothing was ever loaded).
     */
    loadSources(): Promise<MemoryExplorerSourceOption[]> {
      const inFlight = sourcesRequests.get(this);
      if (inFlight) return inFlight;
      const request = this.requestSources().finally(() => { sourcesRequests.delete(this); });
      sourcesRequests.set(this, request);
      return request;
    },

    async requestSources(): Promise<MemoryExplorerSourceOption[]> {
      this.sourceLoading = true;
      this.sourceError = null;
      try {
        const { data, errors } = await getApolloClient().query<ListSourcesQuery>({
          query: LIST_MEMORY_EXPLORER_SOURCES,
          fetchPolicy: 'network-only',
        });
        if (errors?.length) throw new Error(errorMessage(errors));
        this.sources = data?.listMemoryExplorerSources?.length ? data.listMemoryExplorerSources : [localSource()];
        this.sourcesLoaded = true;
        return this.sources;
      } catch (error: any) {
        this.sourceError = error?.message || 'Failed to load memory sources.';
        return this.sources;
      } finally {
        this.sourceLoading = false;
      }
    },

    hasSource(key: string): boolean {
      return this.sources.some((source) => source.key === key);
    },

    setSelectedSourceByKey(key?: string | null): boolean {
      const normalizedKey = key && key.trim() ? key.trim() : 'local';
      const source = this.sources.find((candidate) => candidate.key === normalizedKey);
      const next = source ?? this.sources[0] ?? localSource();
      if (this.selectedSource.key !== next.key || !source) {
        this.selectedSource = next;
        this.resetForSourceChange();
      }
      return Boolean(source);
    },

    /** The Browse cards of the selected source: agents, teams and orgs, all of them. */
    async fetchOwners(): Promise<void> {
      this.ownersSourceKey = this.selectedSource.key;
      await Promise.all([
        this.fetchList(this.agents, LIST_AGENTS_WITH_MEMORY, 'listAgentsWithMemory'),
        this.fetchList(this.teams, LIST_AGENT_TEAMS_WITH_MEMORY, 'listAgentTeamsWithMemory'),
        this.fetchList(this.orgs, LIST_AGENT_ORGS_WITH_MEMORY, 'listAgentOrgsWithMemory'),
      ]);
    },

    /** The cards for an owner's page reached directly by its address: loaded once per source. */
    async ensureOwners(): Promise<void> {
      if (this.ownersSourceKey !== this.selectedSource.key) await this.fetchOwners();
    },

    /** One agent's episodes (or the unattributed runs); another owner's list is cleared first. */
    async fetchEpisodes(selector: AgentWithMemorySelector): Promise<void> {
      const ownerKey = episodesOwnerKey(selector);
      if (this.episodes.ownerKey !== ownerKey) {
        resetList(this.episodes);
        this.episodes.ownerKey = ownerKey;
      }
      await this.fetchList(this.episodes, LIST_AGENT_EPISODES, 'listAgentEpisodes', { selector });
    },

    async setEpisodesSearch(selector: AgentWithMemorySelector, search: string) {
      this.episodes.search = search;
      this.episodes.page = 1;
      await this.fetchEpisodes(selector);
    },

    async changeEpisodesPage(selector: AgentWithMemorySelector, page: number) {
      this.episodes.page = Math.max(1, page);
      await this.fetchEpisodes(selector);
    },

    /** A team's or org's members for its page; another group's list is cleared first. */
    async fetchMembers(kind: MemoryGroupKind, definitionId: string): Promise<void> {
      const key = groupMembersKey(kind, definitionId);
      if (this.members.key !== key) this.members = { key, entries: [], loading: false, error: null, requestId: this.members.requestId + 1 };
      const requestId = ++this.members.requestId;
      this.members.loading = true;
      this.members.error = null;
      try {
        const entries = await this.requestMembers(kind, definitionId);
        if (requestId !== this.members.requestId) return;
        this.members.entries = entries;
      } catch (error: any) {
        if (requestId === this.members.requestId) this.members.error = error?.message || 'Failed to load the members.';
      } finally {
        if (requestId === this.members.requestId) this.members.loading = false;
      }
    },

    /** Every team's and org's members not loaded yet, for an agent page's "Belongs to" / "Also works in" line. */
    async loadAllGroupMembers(): Promise<void> {
      const groups: Array<[MemoryGroupKind, string]> = [
        ...this.teams.entries.map((team) => ['TEAM', team.teamDefinitionId] as [MemoryGroupKind, string]),
        ...this.orgs.entries.map((org) => ['ORG', org.orgDefinitionId] as [MemoryGroupKind, string]),
      ];
      await Promise.all(groups
        .filter(([kind, id]) => !this.groupMembers[groupMembersKey(kind, id)])
        .map(([kind, id]) => this.requestMembers(kind, id).catch(() => [])));
    },

    async requestMembers(kind: MemoryGroupKind, definitionId: string): Promise<MemoryGroupMember[]> {
      const sourceKey = this.selectedSource.key;
      const { data, errors } = await getApolloClient().query<ListMembersQuery>({
        query: LIST_MEMORY_GROUP_MEMBERS,
        variables: { kind, definitionId, source: this.selectedSourceInput },
        fetchPolicy: 'network-only',
      });
      if (errors?.length) throw new Error(errorMessage(errors));
      const entries = data?.listMemoryGroupMembers ?? [];
      if (sourceKey === this.selectedSource.key) this.groupMembers[groupMembersKey(kind, definitionId)] = entries;
      return entries;
    },

    async fetchTeamRuns(teamDefinitionId: string) {
      return await this.fetchList(this.teamRuns, LIST_AGENT_TEAM_RUNS_WITH_MEMORY, 'listAgentTeamRunsWithMemory', { teamDefinitionId });
    },

    async fetchOrgRuns(orgDefinitionId: string) {
      return await this.fetchList(this.orgRuns, LIST_AGENT_ORG_RUNS_WITH_MEMORY, 'listAgentOrgRunsWithMemory', { orgDefinitionId });
    },

    setSelectedTeamFromRoute(teamDefinitionId: string, teamDefinitionName?: string | null) {
      if (this.selectedTeam?.teamDefinitionId !== teamDefinitionId) resetList(this.teamRuns);
      this.selectedTeam = this.teams.entries.find((team) => team.teamDefinitionId === teamDefinitionId) ?? {
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
      this.selectedOrg = this.orgs.entries.find((org) => org.orgDefinitionId === orgDefinitionId) ?? {
        orgDefinitionId,
        orgDefinitionName: orgDefinitionName || orgDefinitionId,
        orgRunCount: this.orgRuns.total,
        memberMemoryCount: 0,
        latestMemoryAt: null,
        memory: this.emptyMemory(),
      };
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

    async changeTeamRunsPage(teamDefinitionId: string, page: number) {
      this.teamRuns.page = Math.max(1, page);
      await this.fetchTeamRuns(teamDefinitionId);
    },

    async changeOrgRunsPage(orgDefinitionId: string, page: number) {
      this.orgRuns.page = Math.max(1, page);
      await this.fetchOrgRuns(orgDefinitionId);
    },

    /** Another source: nothing of the previous one shows (its cards, episodes, members and runs). */
    resetForSourceChange() {
      this.ownersSourceKey = null;
      resetList(this.agents);
      resetList(this.teams);
      resetList(this.orgs);
      resetList(this.episodes);
      resetList(this.teamRuns);
      resetList(this.orgRuns);
      this.episodes.ownerKey = null;
      this.members = { key: null, entries: [], loading: false, error: null, requestId: this.members.requestId + 1 };
      this.groupMembers = {};
      this.selectedTeam = null;
      this.selectedOrg = null;
    },

    emptyMemory() {
      return {
        latestMemoryAt: null,
        hasWorkJournal: false,
        hasRawTraces: false,
        hasRawArchive: false,
      };
    },

    async fetchList<T>(state: ListState<T>, query: any, dataKey: string, extraVariables: Record<string, unknown> = {}) {
      state.loading = true;
      state.error = null;
      const currentRequestId = ++state.requestId;
      try {
        const { data, errors } = await getApolloClient().query<any, PageVariables & Record<string, unknown>>({
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
        if (errors?.length) throw new Error(errorMessage(errors));
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
