import { computed, ref, watch, type Ref } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import type { MobileWorkContext } from '~/types/mobileWork';

export function useMobilePendingTeamRunAttachments(contextRef: Ref<MobileWorkContext | null>) {
  const teamContextsStore = useAgentTeamContextsStore();
  const mobileWorkStore = useMobileWorkStore();
  const error = ref<string | null>(null);

  const pendingAttachments = computed(() => {
    const context = contextRef.value;
    if (context?.kind !== 'team-run') {
      return [];
    }
    return mobileWorkStore.getPendingTeamRunAttachments(context.teamRunId);
  });

  watch(
    () => contextRef.value?.kind === 'team-run' ? contextRef.value.teamRunId : null,
    () => {
      error.value = null;
    },
  );

  async function flushPendingTeamRunAttachmentsToFocusedMember(teamRunId: string, memberRouteKey: string): Promise<void> {
    const normalizedTeamRunId = teamRunId.trim();
    const normalizedMemberRouteKey = memberRouteKey.trim();
    const attachments = mobileWorkStore.getPendingTeamRunAttachments(normalizedTeamRunId);
    if (attachments.length === 0) {
      error.value = null;
      return;
    }

    const teamContext = teamContextsStore.getTeamContextById(normalizedTeamRunId);
    if (!teamContext) {
      error.value = 'Open the team run before sending with pending context files.';
      throw new Error(error.value);
    }

    const focusedNode = teamContext.memberNodesByRouteKey.get(normalizedMemberRouteKey) || null;
    const focusedMember = teamContext.leafAgentContextsByRouteKey.get(normalizedMemberRouteKey) || null;
    if (!focusedNode || focusedNode.memberKind !== 'agent' || !focusedMember) {
      error.value = 'Choose a team member before sending with pending context files.';
      throw new Error(error.value);
    }

    for (const attachment of attachments) {
      if (!focusedMember.contextFilePaths.some((entry) => entry.locator === attachment.locator)) {
        focusedMember.contextFilePaths.push(attachment);
      }
    }
    mobileWorkStore.clearPendingTeamRunAttachments(normalizedTeamRunId);
    error.value = null;
  }

  async function beforeSend(): Promise<void> {
    const context = contextRef.value;
    if (context?.kind !== 'team-run') {
      error.value = null;
      return;
    }

    const teamContext = teamContextsStore.getTeamContextById(context.teamRunId);
    const focusedMemberRouteKey = teamContext?.focusedMemberRouteKey || context.focusedMemberRouteKey;
    await flushPendingTeamRunAttachmentsToFocusedMember(context.teamRunId, focusedMemberRouteKey || '');
  }

  return {
    beforeSend,
    error,
    flushPendingTeamRunAttachmentsToFocusedMember,
    pendingAttachments,
  };
}
