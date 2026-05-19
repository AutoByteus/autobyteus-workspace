import { useAgentSelectionStore, type SelectionType } from '~/stores/agentSelectionStore';

export function selectMobileRun(runId: string, type: SelectionType = 'agent'): void {
  useAgentSelectionStore().selectRunWithoutShellNavigation(runId, type);
}

export function clearMobileRunSelection(): void {
  useAgentSelectionStore().clearSelectionWithoutShellNavigation();
}
