import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ContextAttachment } from '~/types/conversation';
import type { MobileTaskTab, MobileWorkContext } from '~/types/mobileWork';
import { preferredTabForMobileContext } from '~/types/mobileWork';

export const useMobileWorkStore = defineStore('mobileWork', () => {
  const currentContext = ref<MobileWorkContext | null>(null);
  const activeTab = ref<MobileTaskTab>('chat');
  const draftContextAttachments = ref<ContextAttachment[]>([]);

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

  function clearContext(): void {
    currentContext.value = null;
    activeTab.value = 'chat';
    clearDraftContextAttachments();
  }

  return {
    currentContext,
    activeTab,
    draftContextAttachments,
    draftContextAttachmentCount,
    selectContext,
    setActiveTab,
    addDraftContextAttachment,
    removeDraftContextAttachment,
    clearDraftContextAttachments,
    consumeDraftContextAttachments,
    clearContext,
  };
});
