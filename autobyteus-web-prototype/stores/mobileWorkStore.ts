import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ContextAttachment } from '~/types/conversation';
import type {
  MobileFilePreviewRequest,
  MobileRunSetupIntent,
  MobileRunSetupIntentRequest,
  MobileTaskTab,
  MobileWorkContext,
} from '~/types/mobileWork';
import { preferredTabForMobileContext } from '~/types/mobileWork';

const normalizeMobileTaskTab = (tab: MobileTaskTab | string | null | undefined): MobileTaskTab => (
  tab === 'chat' || tab === 'runs' || tab === 'files' || tab === 'artifacts' || tab === 'activity'
    ? tab
    : 'chat'
);

export const useMobileWorkStore = defineStore('mobileWork', () => {
  const currentContext = ref<MobileWorkContext | null>(null);
  const activeTab = ref<MobileTaskTab>('chat');
  const draftContextAttachments = ref<ContextAttachment[]>([]);
  const pendingTeamRunAttachmentsByTeamRunId = ref<Record<string, ContextAttachment[]>>({});
  const focusedAgentRunIdByTeamRunId = ref<Record<string, string>>({});
  const runSetupIntent = ref<MobileRunSetupIntent | null>(null);
  const nextRunSetupRevision = ref(0);
  const pendingFilePreviewRequest = ref<MobileFilePreviewRequest | null>(null);
  const nextFilePreviewRevision = ref(0);

  const draftContextAttachmentCount = computed(() => draftContextAttachments.value.length);

  function selectContext(context: MobileWorkContext, tab?: MobileTaskTab): void {
    currentContext.value = context;
    activeTab.value = normalizeMobileTaskTab(tab ?? preferredTabForMobileContext(context));
    runSetupIntent.value = null;
    pendingFilePreviewRequest.value = null;
  }

  function setActiveTab(tab: MobileTaskTab | string): void {
    activeTab.value = normalizeMobileTaskTab(tab);
  }

  function requestRunSetup(intent: MobileRunSetupIntentRequest): MobileRunSetupIntent {
    nextRunSetupRevision.value += 1;
    const nextIntent = {
      ...intent,
      revision: nextRunSetupRevision.value,
    } as MobileRunSetupIntent;
    runSetupIntent.value = nextIntent;
    activeTab.value = 'runs';
    return nextIntent;
  }

  function consumeRunSetupIntent(revision: number): void {
    if (runSetupIntent.value?.revision === revision) {
      runSetupIntent.value = null;
    }
  }

  function requestFilePreview(request: Omit<MobileFilePreviewRequest, 'revision'>): MobileFilePreviewRequest {
    nextFilePreviewRevision.value += 1;
    const nextRequest: MobileFilePreviewRequest = {
      ...request,
      revision: nextFilePreviewRevision.value,
    };
    pendingFilePreviewRequest.value = nextRequest;
    activeTab.value = 'files';
    return nextRequest;
  }

  function consumeFilePreviewRequest(revision: number): void {
    if (pendingFilePreviewRequest.value?.revision === revision) {
      pendingFilePreviewRequest.value = null;
    }
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

  function getPendingTeamRunAttachments(teamRunId: string): ContextAttachment[] {
    return [...(pendingTeamRunAttachmentsByTeamRunId.value[teamRunId.trim()] || [])];
  }

  function hasPendingTeamRunAttachments(teamRunId: string): boolean {
    return getPendingTeamRunAttachments(teamRunId).length > 0;
  }

  function setPendingTeamRunAttachments(teamRunId: string, attachments: ContextAttachment[]): void {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return;
    }
    const uniqueAttachments = attachments.filter((attachment, index, entries) => (
      attachment.locator.trim() &&
      entries.findIndex((entry) => entry.locator === attachment.locator) === index
    ));
    pendingTeamRunAttachmentsByTeamRunId.value = {
      ...pendingTeamRunAttachmentsByTeamRunId.value,
      [normalizedTeamRunId]: uniqueAttachments,
    };
  }

  function addPendingTeamRunAttachment(teamRunId: string, attachment: ContextAttachment): boolean {
    const normalizedTeamRunId = teamRunId.trim();
    const locator = attachment.locator.trim();
    if (!normalizedTeamRunId || !locator) {
      return false;
    }
    const existing = pendingTeamRunAttachmentsByTeamRunId.value[normalizedTeamRunId] || [];
    if (existing.some((entry) => entry.locator === locator)) {
      return false;
    }
    setPendingTeamRunAttachments(normalizedTeamRunId, [...existing, attachment]);
    return true;
  }

  function moveDraftAttachmentsToPendingTeamRun(teamRunId: string): ContextAttachment[] {
    const attachments = consumeDraftContextAttachments();
    attachments.forEach((attachment) => addPendingTeamRunAttachment(teamRunId, attachment));
    return getPendingTeamRunAttachments(teamRunId);
  }

  function removePendingTeamRunAttachment(teamRunId: string, attachmentId: string): void {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return;
    }
    setPendingTeamRunAttachments(
      normalizedTeamRunId,
      getPendingTeamRunAttachments(normalizedTeamRunId).filter((entry) => entry.id !== attachmentId),
    );
  }

  function clearPendingTeamRunAttachments(teamRunId: string): void {
    const normalizedTeamRunId = teamRunId.trim();
    if (!normalizedTeamRunId) {
      return;
    }
    const { [normalizedTeamRunId]: _removed, ...remaining } = pendingTeamRunAttachmentsByTeamRunId.value;
    pendingTeamRunAttachmentsByTeamRunId.value = remaining;
  }

  function consumePendingTeamRunAttachments(teamRunId: string): ContextAttachment[] {
    const attachments = getPendingTeamRunAttachments(teamRunId);
    clearPendingTeamRunAttachments(teamRunId);
    return attachments;
  }

  function rememberFocusedTeamMember(teamRunId: string, agentRunId: string): boolean {
    const normalizedTeamRunId = teamRunId.trim();
    const normalizedAgentRunId = agentRunId.trim();
    if (!normalizedTeamRunId || !normalizedAgentRunId) {
      return false;
    }
    focusedAgentRunIdByTeamRunId.value = {
      ...focusedAgentRunIdByTeamRunId.value,
      [normalizedTeamRunId]: normalizedAgentRunId,
    };
    return true;
  }

  function getRememberedFocusedTeamMember(teamRunId: string): string | null {
    return focusedAgentRunIdByTeamRunId.value[teamRunId.trim()] || null;
  }

  function updateFocusedTeamMember(teamRunId: string, agentRunId: string): boolean {
    const normalizedTeamRunId = teamRunId.trim();
    const normalizedAgentRunId = agentRunId.trim();
    const current = currentContext.value;
    if (
      !normalizedTeamRunId ||
      !normalizedAgentRunId ||
      current?.kind !== 'team-run' ||
      current.teamRunId !== normalizedTeamRunId
    ) {
      return false;
    }

    currentContext.value = {
      ...current,
      focusedAgentRunId: normalizedAgentRunId,
    };
    pendingFilePreviewRequest.value = null;
    rememberFocusedTeamMember(normalizedTeamRunId, normalizedAgentRunId);
    return true;
  }

  function clearContext(): void {
    currentContext.value = null;
    activeTab.value = 'chat';
    runSetupIntent.value = null;
    pendingFilePreviewRequest.value = null;
    clearDraftContextAttachments();
    pendingTeamRunAttachmentsByTeamRunId.value = {};
  }

  return {
    currentContext,
    activeTab,
    draftContextAttachments,
    pendingTeamRunAttachmentsByTeamRunId,
    focusedAgentRunIdByTeamRunId,
    runSetupIntent,
    pendingFilePreviewRequest,
    draftContextAttachmentCount,
    selectContext,
    setActiveTab,
    requestRunSetup,
    consumeRunSetupIntent,
    requestFilePreview,
    consumeFilePreviewRequest,
    addDraftContextAttachment,
    removeDraftContextAttachment,
    clearDraftContextAttachments,
    consumeDraftContextAttachments,
    getPendingTeamRunAttachments,
    hasPendingTeamRunAttachments,
    addPendingTeamRunAttachment,
    moveDraftAttachmentsToPendingTeamRun,
    removePendingTeamRunAttachment,
    clearPendingTeamRunAttachments,
    consumePendingTeamRunAttachments,
    rememberFocusedTeamMember,
    getRememberedFocusedTeamMember,
    updateFocusedTeamMember,
    clearContext,
  };
});
