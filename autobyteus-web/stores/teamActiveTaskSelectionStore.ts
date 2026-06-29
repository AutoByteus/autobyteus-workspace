import { defineStore } from 'pinia';

export interface TeamActiveTaskSelection {
  memberRouteKey: string;
  referenceId: string | null;
}

interface TeamActiveTaskSelectionState {
  selectionByTeamRunId: Record<string, TeamActiveTaskSelection>;
}

const normalizeKey = (value: string | null | undefined): string => value?.trim() ?? '';

export const useTeamActiveTaskSelectionStore = defineStore('teamActiveTaskSelection', {
  state: (): TeamActiveTaskSelectionState => ({
    selectionByTeamRunId: {},
  }),

  getters: {
    getSelection: (state) => (teamRunId: string): TeamActiveTaskSelection | null => {
      const key = normalizeKey(teamRunId);
      return key ? state.selectionByTeamRunId[key] ?? null : null;
    },
  },

  actions: {
    selectTask(teamRunId: string, memberRouteKey: string) {
      const teamKey = normalizeKey(teamRunId);
      const memberKey = normalizeKey(memberRouteKey);
      if (!teamKey || !memberKey) {
        return;
      }

      this.selectionByTeamRunId = {
        ...this.selectionByTeamRunId,
        [teamKey]: {
          memberRouteKey: memberKey,
          referenceId: null,
        },
      };
    },

    selectReference(teamRunId: string, memberRouteKey: string, referenceId: string) {
      const teamKey = normalizeKey(teamRunId);
      const memberKey = normalizeKey(memberRouteKey);
      const referenceKey = normalizeKey(referenceId);
      if (!teamKey || !memberKey || !referenceKey) {
        return;
      }

      this.selectionByTeamRunId = {
        ...this.selectionByTeamRunId,
        [teamKey]: {
          memberRouteKey: memberKey,
          referenceId: referenceKey,
        },
      };
    },

    clearSelection(teamRunId: string) {
      const teamKey = normalizeKey(teamRunId);
      if (!teamKey || !(teamKey in this.selectionByTeamRunId)) {
        return;
      }

      const { [teamKey]: _removed, ...remaining } = this.selectionByTeamRunId;
      this.selectionByTeamRunId = remaining;
    },
  },
});
