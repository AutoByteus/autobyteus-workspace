import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ContextAttachment } from '~/types/conversation';
import type { MobileTaskTab, MobileWorkContext } from '~/types/mobileWork';
import { preferredTabForMobileContext } from '~/types/mobileWork';

export const useMobileWorkStore = defineStore('mobileWork', () => {
  const currentContext = ref<MobileWorkContext | null>(null);
  const activeTab = ref<MobileTaskTab>('chat');
  const draftContextAttachments = ref<ContextAttachment[]>([]);
  const focusedMemberRouteKeyByTeamRunId = ref<Record<string, string>>({});

  const draftContextAttachmentCount = computed(() => draftContextAttachments.value.length);

  function selectContext(context: MobileWorkContext, tab?: MobileTaskTab): void {
    currentContext.value = context;
    activeTab.value = tab ?? preferredTabForMobileContext(context);
  }

  function setActiveTab(tab: MobileTaskTab): void {
    activeTab.value = tab;
  }

  function addDraftContextAttachment(attachment: ContextAttachment): void {
    const locator = attachment.locator.trim();
    if (!locator || draftContextAttachments.value.some((entry) => entry.locator === locator)) {
      return;
    }
    draftContextAttachments.value.push(attachment);
  }

  function removeDraftContextAttachment(attachmentId: string): void {
    draftContextAttachments.value = draftContextAttachments.value.filter((entry) => entry.id !== attachmentId);
  }

  function clearDraftContextAttachments(): void {
    draftContextAttachments.value = [];
  }

  function consumeDraftContextAttachments(): ContextAttachment[] {
    const attachments = [...draftContextAttachments.value];
    clearDraftContextAttachments();
    return attachments;
  }

  function rememberFocusedTeamMember(teamRunId: string, memberRouteKey: string): boolean {
    const normalizedTeamRunId = teamRunId.trim();
    const normalizedMemberRouteKey = memberRouteKey.trim();
    if (!normalizedTeamRunId || !normalizedMemberRouteKey) {
      return false;
    }
    focusedMemberRouteKeyByTeamRunId.value = {
      ...focusedMemberRouteKeyByTeamRunId.value,
      [normalizedTeamRunId]: normalizedMemberRouteKey,
    };
    return true;
  }

  function getRememberedFocusedTeamMember(teamRunId: string): string {
    return focusedMemberRouteKeyByTeamRunId.value[teamRunId.trim()] || '';
  }

  function updateFocusedTeamMember(teamRunId: string, memberRouteKey: string): boolean {
    const normalizedTeamRunId = teamRunId.trim();
    const normalizedMemberRouteKey = memberRouteKey.trim();
    const current = currentContext.value;
    if (
      !normalizedTeamRunId ||
      !normalizedMemberRouteKey ||
      current?.kind !== 'team-run' ||
      current.teamRunId !== normalizedTeamRunId
    ) {
      return false;
    }

    currentContext.value = {
      ...current,
      focusedMemberRouteKey: normalizedMemberRouteKey,
    };
    rememberFocusedTeamMember(normalizedTeamRunId, normalizedMemberRouteKey);
    return true;
  }

  function clearContext(): void {
    currentContext.value = null;
    activeTab.value = 'chat';
    clearDraftContextAttachments();
  }

  return {
    currentContext,
    activeTab,
    draftContextAttachments,
    focusedMemberRouteKeyByTeamRunId,
    draftContextAttachmentCount,
    selectContext,
    setActiveTab,
    addDraftContextAttachment,
    removeDraftContextAttachment,
    clearDraftContextAttachments,
    consumeDraftContextAttachments,
    rememberFocusedTeamMember,
    getRememberedFocusedTeamMember,
    updateFocusedTeamMember,
    clearContext,
  };
});
