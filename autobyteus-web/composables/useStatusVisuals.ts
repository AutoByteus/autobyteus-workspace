import { computed, type Ref } from 'vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

interface StatusVisuals {
  text: string;
  colorClass: string;
  iconName: string;
}

export function useStatusVisuals(status: Ref<string | undefined>) {
  const visuals = computed((): StatusVisuals => {
    const currentStatus = String(status.value || AgentStatus.Idle).toLowerCase();

    switch (currentStatus) {
      case AgentStatus.Running:
        return { text: 'Running', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:arrow-path-solid' };
      case AgentStatus.Error:
        return { text: 'Error', colorClass: 'bg-red-500', iconName: 'heroicons:exclamation-triangle-solid' };
      case AgentStatus.Idle:
      default:
        return { text: 'Idle', colorClass: 'bg-green-500', iconName: 'heroicons:check-circle-solid' };
    }
  });

  return { visuals };
}
