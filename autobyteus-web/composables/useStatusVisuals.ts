import { computed, type Ref } from 'vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

interface StatusVisuals {
  text: string;
  colorClass: string;
  iconName: string;
}

export function useStatusVisuals(status: Ref<string | undefined>) {
  const visuals = computed((): StatusVisuals => {
    const rawStatus = status.value || AgentStatus.Uninitialized;
    const currentStatus = String(rawStatus).toLowerCase();

    switch (currentStatus) {
      // Explicitly handle uninitialized state
      case AgentStatus.Uninitialized:
        return { text: 'Uninitialized', colorClass: 'bg-gray-400', iconName: 'heroicons:cog-solid' };

      // Initialization states
      case AgentStatus.Bootstrapping:
        return { text: 'Bootstrapping', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:cog-solid' };

      // Idle state
      case AgentStatus.Idle:
        return { text: 'Idle', colorClass: 'bg-green-500', iconName: 'heroicons:check-circle-solid' };

      // Core processing loop
      case AgentStatus.ProcessingUserInput:
        return { text: 'Processing Input', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:cog-solid' };
      case AgentStatus.AwaitingLlmResponse:
        return { text: 'Awaiting LLM Response', colorClass: 'bg-purple-500 animate-pulse', iconName: 'heroicons:arrow-path-solid' };
      case AgentStatus.AnalyzingLlmResponse:
        return { text: 'Analyzing Response', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:cog-solid' };
      case AgentStatus.AwaitingToolApproval:
        return { text: 'Awaiting Approval', colorClass: 'bg-yellow-500', iconName: 'heroicons:clock-solid' };
      case AgentStatus.ToolDenied:
        return { text: 'Tool Denied', colorClass: 'bg-amber-500', iconName: 'heroicons:exclamation-triangle-solid' };
      case AgentStatus.ExecutingTool:
        return { text: 'Executing Tool', colorClass: 'bg-cyan-500 animate-pulse', iconName: 'heroicons:play-solid' };
      case AgentStatus.ProcessingToolResult:
        return { text: 'Processing Tool Result', colorClass: 'bg-blue-500 animate-pulse', iconName: 'heroicons:cog-solid' };

      // Terminal states
      case AgentStatus.Error:
        return { text: 'Error', colorClass: 'bg-red-500', iconName: 'heroicons:exclamation-triangle-solid' };
      case AgentStatus.ShuttingDown:
        return { text: 'Shutting Down', colorClass: 'bg-orange-500 animate-pulse', iconName: 'heroicons:exclamation-triangle-solid' };
      case AgentStatus.ShutdownComplete:
        return { text: 'Offline', colorClass: 'bg-slate-600', iconName: 'heroicons:exclamation-triangle-solid' };

      // Default/fallback state
      default:
        return { text: 'Initializing', colorClass: 'bg-orange-400', iconName: 'heroicons:cog-solid' };
    }
  });

  return { visuals };
}
