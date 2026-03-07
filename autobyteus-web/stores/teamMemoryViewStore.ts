import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_TEAM_MEMBER_RUN_MEMORY_VIEW } from '~/graphql/queries/teamMemoryQueries';
import type { RunMemoryView } from '~/types/memory';

type GetTeamMemberRunMemoryViewQuery = {
  getTeamMemberRunMemoryView?: RunMemoryView | null;
};

type GetTeamMemberRunMemoryViewQueryVariables = {
  teamRunId: string;
  memberRunId: string;
  includeWorkingContext?: boolean;
  includeEpisodic?: boolean;
  includeSemantic?: boolean;
  includeRawTraces?: boolean;
  includeArchive?: boolean;
  rawTraceLimit?: number;
  conversationLimit?: number;
};

interface TeamMemoryViewState {
  selectedTeamRunId: string | null;
  selectedTeamDefinitionName: string | null;
  selectedMemberRouteKey: string | null;
  selectedMemberName: string | null;
  selectedMemberRunId: string | null;
  memoryView: RunMemoryView | null;
  loading: boolean;
  error: string | null;
  rawTraceLimit: number;
  conversationLimit: number;
  includeRawTraces: boolean;
  requestId: number;
}

export const useTeamMemoryViewStore = defineStore('teamMemoryViewStore', {
  state: (): TeamMemoryViewState => ({
    selectedTeamRunId: null,
    selectedTeamDefinitionName: null,
    selectedMemberRouteKey: null,
    selectedMemberName: null,
    selectedMemberRunId: null,
    memoryView: null,
    loading: false,
    error: null,
    rawTraceLimit: 500,
    conversationLimit: 200,
    includeRawTraces: false,
    requestId: 0,
  }),

  actions: {
    async fetchMemoryView(teamRunId?: string, memberRunId?: string): Promise<RunMemoryView | null> {
      const resolvedTeamRunId = teamRunId || this.selectedTeamRunId;
      const resolvedMemberRunId = memberRunId || this.selectedMemberRunId;
      if (!resolvedTeamRunId || !resolvedMemberRunId) {
        return null;
      }

      this.loading = true;
      this.error = null;
      const currentRequestId = ++this.requestId;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.query<
          GetTeamMemberRunMemoryViewQuery,
          GetTeamMemberRunMemoryViewQueryVariables
        >({
          query: GET_TEAM_MEMBER_RUN_MEMORY_VIEW,
          variables: {
            teamRunId: resolvedTeamRunId,
            memberRunId: resolvedMemberRunId,
            includeWorkingContext: true,
            includeEpisodic: true,
            includeSemantic: true,
            includeRawTraces: this.includeRawTraces,
            includeArchive: false,
            rawTraceLimit: this.rawTraceLimit,
            conversationLimit: this.conversationLimit,
          },
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (currentRequestId !== this.requestId) {
          return null;
        }

        const payload = data?.getTeamMemberRunMemoryView as RunMemoryView | undefined;
        if (!payload) {
          return null;
        }

        this.memoryView = payload;
        return payload;
      } catch (error: any) {
        if (currentRequestId === this.requestId) {
          this.error = error?.message || 'Failed to fetch team member memory view.';
        }
        return null;
      } finally {
        if (currentRequestId === this.requestId) {
          this.loading = false;
        }
      }
    },

    async setSelectedMember(payload: {
      teamRunId: string;
      teamDefinitionName: string;
      memberRouteKey: string;
      memberName: string;
      memberRunId: string;
    }) {
      this.selectedTeamRunId = payload.teamRunId;
      this.selectedTeamDefinitionName = payload.teamDefinitionName;
      this.selectedMemberRouteKey = payload.memberRouteKey;
      this.selectedMemberName = payload.memberName;
      this.selectedMemberRunId = payload.memberRunId;
      await this.fetchMemoryView(payload.teamRunId, payload.memberRunId);
    },

    async setIncludeRawTraces(value: boolean) {
      if (this.includeRawTraces === value) {
        return;
      }
      this.includeRawTraces = value;
      if (value && this.selectedTeamRunId && this.selectedMemberRunId) {
        await this.fetchMemoryView(this.selectedTeamRunId, this.selectedMemberRunId);
      }
    },

    async setRawTraceLimit(limit: number) {
      this.rawTraceLimit = limit;
      if (this.includeRawTraces && this.selectedTeamRunId && this.selectedMemberRunId) {
        await this.fetchMemoryView(this.selectedTeamRunId, this.selectedMemberRunId);
      }
    },

    clearSelection() {
      this.selectedTeamRunId = null;
      this.selectedTeamDefinitionName = null;
      this.selectedMemberRouteKey = null;
      this.selectedMemberName = null;
      this.selectedMemberRunId = null;
      this.memoryView = null;
      this.error = null;
      this.includeRawTraces = false;
    },
  },
});
