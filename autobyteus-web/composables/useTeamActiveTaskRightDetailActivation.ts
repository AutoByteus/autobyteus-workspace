import { useRightPanel } from '~/composables/useRightPanel';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useTeamOverviewSectionStore } from '~/stores/teamOverviewSectionStore';

export const useTeamActiveTaskRightDetailActivation = () => {
  const { openRightPanel } = useRightPanel();
  const { setActiveTab } = useRightSideTabs();
  const teamOverviewSectionStore = useTeamOverviewSectionStore();

  const activateTeamTaskDetail = (teamRunId: string): void => {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return;
    }

    openRightPanel();
    setActiveTab('teamMembers');
    teamOverviewSectionStore.showActiveTasks(normalizedTeamRunId);
  };

  return {
    activateTeamTaskDetail,
  };
};
