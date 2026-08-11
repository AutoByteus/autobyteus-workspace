import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

export function selectMobileRun(runId: string, type: 'agent' | 'team' = 'agent'): void {
  useAgentSelectionStore().selectRunWithoutShellNavigation(runId, type);
}

export function clearMobileRunSelection(): void {
  useAgentSelectionStore().clearSelectionWithoutShellNavigation();
}
