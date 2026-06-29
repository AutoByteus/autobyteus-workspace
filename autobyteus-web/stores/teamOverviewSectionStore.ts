import { defineStore } from 'pinia';

export type TeamOverviewSection = 'messages' | 'activeTasks';

interface TeamOverviewSectionState {
  sectionByTeamRunId: Record<string, TeamOverviewSection | null>;
}

const DEFAULT_TEAM_OVERVIEW_SECTION: TeamOverviewSection = 'messages';
const normalizeKey = (value: string | null | undefined): string => value?.trim() ?? '';

export const useTeamOverviewSectionStore = defineStore('teamOverviewSection', {
  state: (): TeamOverviewSectionState => ({
    sectionByTeamRunId: {},
  }),

  getters: {
    getActiveSection: (state) => (teamRunId: string): TeamOverviewSection | null => {
      const key = normalizeKey(teamRunId);
      if (!key) {
        return DEFAULT_TEAM_OVERVIEW_SECTION;
      }
      return Object.prototype.hasOwnProperty.call(state.sectionByTeamRunId, key)
        ? state.sectionByTeamRunId[key] ?? null
        : DEFAULT_TEAM_OVERVIEW_SECTION;
    },
  },

  actions: {
    showMessages(teamRunId: string) {
      this.setSection(teamRunId, 'messages');
    },

    showActiveTasks(teamRunId: string) {
      this.setSection(teamRunId, 'activeTasks');
    },

    toggleSection(teamRunId: string, section: TeamOverviewSection) {
      const teamKey = normalizeKey(teamRunId);
      if (!teamKey) {
        return;
      }

      const currentSection = this.getActiveSection(teamKey);
      this.sectionByTeamRunId = {
        ...this.sectionByTeamRunId,
        [teamKey]: currentSection === section ? null : section,
      };
    },

    setSection(teamRunId: string, section: TeamOverviewSection | null) {
      const teamKey = normalizeKey(teamRunId);
      if (!teamKey) {
        return;
      }

      this.sectionByTeamRunId = {
        ...this.sectionByTeamRunId,
        [teamKey]: section,
      };
    },

    clearSection(teamRunId: string) {
      const teamKey = normalizeKey(teamRunId);
      if (!teamKey || !(teamKey in this.sectionByTeamRunId)) {
        return;
      }

      const { [teamKey]: _removed, ...remaining } = this.sectionByTeamRunId;
      this.sectionByTeamRunId = remaining;
    },
  },
});
