import { computed, type Ref } from 'vue';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

interface StatusVisuals {
  text: string;
  colorClass: string;
  iconName: string;
}

export function useTeamStatusVisuals(status: Ref<string | undefined>) {
  const visuals = computed((): StatusVisuals => {
    const currentStatus = String(status.value || AgentTeamStatus.Uninitialized).toLowerCase();

    switch (currentStatus) {
      case AgentTeamStatus.Uninitialized:
        return { text: 'Uninitialized', colorClass: 'bg-gray-400', iconName: 'heroicons:cog-solid' };
      case AgentTeamStatus.Bootstrapping:
        return { text: 'Bootstrapping', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:cog-solid' };
      case AgentTeamStatus.Idle:
        return { text: 'Idle', colorClass: 'bg-green-500', iconName: 'heroicons:check-circle-solid' };
      case AgentTeamStatus.Processing:
        return { text: 'Processing', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:arrow-path-solid' };
      case AgentTeamStatus.ShuttingDown:
        return { text: 'Shutting Down', colorClass: 'bg-orange-500 animate-pulse', iconName: 'heroicons:exclamation-triangle-solid' };
      case AgentTeamStatus.ShutdownComplete:
        return { text: 'Offline', colorClass: 'bg-slate-600', iconName: 'heroicons:exclamation-triangle-solid' };
      case AgentTeamStatus.Error:
        return { text: 'Error', colorClass: 'bg-red-500', iconName: 'heroicons:exclamation-triangle-solid' };
      default:
        return { text: 'Initializing', colorClass: 'bg-orange-400', iconName: 'heroicons:cog-solid' };
    }
  });

  return { visuals };
}
