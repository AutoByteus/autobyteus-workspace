import { defineStore } from 'pinia';

export type TeamWorkspaceViewMode = 'focus' | 'grid' | 'spotlight';

interface TeamWorkspaceViewState {
  modeByTeamRunId: Record<string, TeamWorkspaceViewMode>;
}

export const useTeamWorkspaceViewStore = defineStore('teamWorkspaceView', {
  state: (): TeamWorkspaceViewState => ({
    modeByTeamRunId: {},
  }),

  actions: {
    getMode(teamRunId?: string | null): TeamWorkspaceViewMode {
      if (!teamRunId) {
        return 'focus';
      }
      return this.modeByTeamRunId[teamRunId] || 'focus';
    },

    setMode(teamRunId: string, mode: TeamWorkspaceViewMode): void {
      if (!teamRunId) {
        return;
      }
      this.modeByTeamRunId = {
        ...this.modeByTeamRunId,
        [teamRunId]: mode,
      };
    },

    migrateMode(previousTeamRunId: string, nextTeamRunId: string): void {
      if (!previousTeamRunId || !nextTeamRunId || previousTeamRunId === nextTeamRunId) {
        return;
      }

      const existingMode = this.modeByTeamRunId[previousTeamRunId];
      if (!existingMode) {
        return;
      }

      const { [previousTeamRunId]: _removed, ...remaining } = this.modeByTeamRunId;
      this.modeByTeamRunId = {
        ...remaining,
        [nextTeamRunId]: existingMode,
      };
    },

    clearMode(teamRunId?: string): void {
      if (!teamRunId) {
        this.modeByTeamRunId = {};
        return;
      }

      const { [teamRunId]: _removed, ...remaining } = this.modeByTeamRunId;
      this.modeByTeamRunId = remaining;
    },
  },
});
