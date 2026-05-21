import { watch } from 'vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';

const isTemporaryAgentRunId = (runId: string): boolean => runId.startsWith('temp-') && !runId.startsWith('temp-team-');
const isTemporaryTeamRunId = (teamRunId: string): boolean => teamRunId.startsWith('temp-team-');

/**
 * Keeps the mobile shell's current context aligned when existing core run stores
 * promote a mobile-created temporary id to a permanent backend id after first send.
 *
 * This is intentionally mobile-owned session reconciliation: it observes the
 * authoritative core selection/context stores but does not change send,
 * runtime/model, backend, or run-lifecycle semantics.
 */
export function useMobilePromotedRunContextSync() {
  const selectionStore = useAgentSelectionStore();
  const agentContextsStore = useAgentContextsStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const mobileWorkStore = useMobileWorkStore();

  function reconcileAgentContext(): boolean {
    const context = mobileWorkStore.currentContext;
    const selectedRunId = selectionStore.selectedRunId;
    if (
      context?.kind !== 'agent-run' ||
      selectionStore.selectedType !== 'agent' ||
      !selectedRunId ||
      selectedRunId === context.runId ||
      !isTemporaryAgentRunId(context.runId) ||
      agentContextsStore.getRun(context.runId)
    ) {
      return false;
    }

    const promotedRun = agentContextsStore.getRun(selectedRunId);
    if (!promotedRun || promotedRun.config.agentDefinitionId !== context.agentDefinitionId) {
      return false;
    }

    mobileWorkStore.selectContext({
      ...context,
      runId: selectedRunId,
      summary: context.summary || promotedRun.state.conversation.id || 'Agent run',
      isActive: true,
      lastActivityAt: new Date().toISOString(),
    }, mobileWorkStore.activeTab);
    return true;
  }

  function reconcileTeamContext(): boolean {
    const context = mobileWorkStore.currentContext;
    const selectedTeamRunId = selectionStore.selectedRunId;
    if (
      context?.kind !== 'team-run' ||
      selectionStore.selectedType !== 'team' ||
      !selectedTeamRunId ||
      selectedTeamRunId === context.teamRunId ||
      !isTemporaryTeamRunId(context.teamRunId) ||
      teamContextsStore.getTeamContextById(context.teamRunId)
    ) {
      return false;
    }

    const promotedTeam = teamContextsStore.getTeamContextById(selectedTeamRunId);
    if (!promotedTeam || promotedTeam.config.teamDefinitionId !== context.teamDefinitionId) {
      return false;
    }

    const pendingAttachments = mobileWorkStore.getPendingTeamRunAttachments(context.teamRunId);
    for (const attachment of pendingAttachments) {
      mobileWorkStore.addPendingTeamRunAttachment(selectedTeamRunId, attachment);
    }
    if (pendingAttachments.length > 0) {
      mobileWorkStore.clearPendingTeamRunAttachments(context.teamRunId);
    }

    const focusedMemberRouteKey = promotedTeam.focusedMemberRouteKey || context.focusedMemberRouteKey;
    if (focusedMemberRouteKey) {
      mobileWorkStore.rememberFocusedTeamMember(selectedTeamRunId, focusedMemberRouteKey);
    }

    mobileWorkStore.selectContext({
      ...context,
      teamRunId: selectedTeamRunId,
      focusedMemberRouteKey,
      isActive: true,
      lastActivityAt: new Date().toISOString(),
    }, mobileWorkStore.activeTab);
    return true;
  }

  function reconcilePromotedCurrentContext(): void {
    if (reconcileAgentContext()) {
      return;
    }
    reconcileTeamContext();
  }

  watch(
    [
      () => selectionStore.selectedType,
      () => selectionStore.selectedRunId,
      () => mobileWorkStore.currentContext,
    ],
    reconcilePromotedCurrentContext,
    { immediate: true },
  );

  return {
    reconcilePromotedCurrentContext,
  };
}
