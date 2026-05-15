import { computed, type Ref } from 'vue';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

interface StatusVisuals {
  text: string;
  colorClass: string;
  iconName: string;
}

export function useTeamStatusVisuals(status: Ref<string | undefined>) {
  const visuals = computed((): StatusVisuals => {
    const currentStatus = String(status.value || AgentTeamStatus.Idle).toLowerCase();

    switch (currentStatus) {
      case AgentTeamStatus.Running:
        return { text: 'Running', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:arrow-path-solid' };
      case AgentTeamStatus.Error:
        return { text: 'Error', colorClass: 'bg-red-500', iconName: 'heroicons:exclamation-triangle-solid' };
      case AgentTeamStatus.Idle:
      default:
        return { text: 'Idle', colorClass: 'bg-green-500', iconName: 'heroicons:check-circle-solid' };
    }
  });

  return { visuals };
}
