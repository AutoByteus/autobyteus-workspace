import { computed } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import type { ContextAttachment } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';
import {
  createWorkspaceContextAttachment,
  inferContextAttachmentType,
} from '~/utils/contextFiles/contextAttachmentModel';

export type MobileAttachmentTarget = 'active-run' | 'mobile-draft' | 'pending-team-run' | 'none';

const addUniqueAttachment = (
  attachments: ContextAttachment[],
  attachment: ContextAttachment,
  add: (attachment: ContextAttachment) => void,
): boolean => {
  const locator = attachment.locator.trim();
  if (!locator || attachments.some((entry) => entry.locator === locator)) {
    return false;
  }
  add(attachment);
  return true;
};

export function useMobileFileContextCoordinator() {
  const activeContextStore = useActiveContextStore();
  const agentContextsStore = useAgentContextsStore();
  const selectionStore = useAgentSelectionStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const mobileWorkStore = useMobileWorkStore();

  const isActiveMobileRunContext = (context: MobileWorkContext | null): boolean => {
    if (context?.kind === 'agent-run') {
      return selectionStore.selectedType === 'agent'
        && selectionStore.selectedRunId === context.runId
        && Boolean(agentContextsStore.getRun(context.runId))
        && activeContextStore.activeAgentContext?.state.runId === context.runId;
    }
    if (context?.kind === 'team-run') {
      const team = teamContextsStore.getTeamContextById(context.teamRunId);
      return selectionStore.selectedType === 'team'
        && selectionStore.selectedRunId === context.teamRunId
        && Boolean(team)
        && Boolean(team && team.view.getFocusedAgentRunId() === context.focusedAgentRunId)
        && Boolean(activeContextStore.activeAgentContext);
    }
    return false;
  };

  const isMobileDraftContext = (context: MobileWorkContext | null): boolean => (
    !context
    || context.kind === 'workspace'
    || context.kind === 'agent-definition'
    || context.kind === 'team-definition'
  );

  const hasPendingTeamRunAttachments = (context: MobileWorkContext | null): boolean => (
    context?.kind === 'team-run' && mobileWorkStore.hasPendingTeamRunAttachments(context.teamRunId)
  );

  const getVisibleContextAttachments = (context: MobileWorkContext | null): ContextAttachment[] => {
    if (hasPendingTeamRunAttachments(context) && context?.kind === 'team-run') {
      return mobileWorkStore.getPendingTeamRunAttachments(context.teamRunId);
    }
    if (isActiveMobileRunContext(context)) {
      return [...activeContextStore.currentContextPaths];
    }
    if (isMobileDraftContext(context)) {
      return [...mobileWorkStore.draftContextAttachments];
    }
    return [];
  };

  const visibleContextAttachments = computed<ContextAttachment[]>(() => getVisibleContextAttachments(mobileWorkStore.currentContext));

  function removeVisibleContextAttachment(context: MobileWorkContext | null, attachmentId: string): void {
    if (hasPendingTeamRunAttachments(context) && context?.kind === 'team-run') {
      mobileWorkStore.removePendingTeamRunAttachment(context.teamRunId, attachmentId);
      return;
    }
    if (isActiveMobileRunContext(context)) {
      const activeIndex = activeContextStore.currentContextPaths.findIndex((entry) => entry.id === attachmentId);
      if (activeIndex !== -1) {
        activeContextStore.removeContextFilePath(activeIndex);
      }
      return;
    }
    if (isMobileDraftContext(context)) {
      mobileWorkStore.removeDraftContextAttachment(attachmentId);
    }
  }

  function clearVisibleContextAttachments(context: MobileWorkContext | null): void {
    if (hasPendingTeamRunAttachments(context) && context?.kind === 'team-run') {
      mobileWorkStore.clearPendingTeamRunAttachments(context.teamRunId);
      return;
    }
    if (isActiveMobileRunContext(context)) {
      activeContextStore.clearContextFilePaths();
      return;
    }
    if (isMobileDraftContext(context)) {
      mobileWorkStore.clearDraftContextAttachments();
    }
  }

  function attachWorkspaceFile(
    filePath: string,
    context: MobileWorkContext | null = mobileWorkStore.currentContext,
  ): { attached: boolean; attachment: ContextAttachment; target: MobileAttachmentTarget } {
    const attachment = createWorkspaceContextAttachment(filePath, inferContextAttachmentType(filePath));
    if (hasPendingTeamRunAttachments(context) && context?.kind === 'team-run') {
      const attached = addUniqueAttachment(
        mobileWorkStore.getPendingTeamRunAttachments(context.teamRunId),
        attachment,
        (next) => mobileWorkStore.addPendingTeamRunAttachment(context.teamRunId, next),
      );
      return { attached, attachment, target: 'pending-team-run' };
    }

    if (isActiveMobileRunContext(context)) {
      const attached = addUniqueAttachment(
        activeContextStore.currentContextPaths,
        attachment,
        (next) => activeContextStore.addContextFilePath(next),
      );
      return { attached, attachment, target: 'active-run' };
    }

    if (isMobileDraftContext(context)) {
      const attached = addUniqueAttachment(
        mobileWorkStore.draftContextAttachments,
        attachment,
        (next) => mobileWorkStore.addDraftContextAttachment(next),
      );
      return { attached, attachment, target: 'mobile-draft' };
    }

    return { attached: false, attachment, target: 'none' };
  }

  return {
    visibleContextAttachments,
    getVisibleContextAttachments,
    removeVisibleContextAttachment,
    clearVisibleContextAttachments,
    attachWorkspaceFile,
  };
}
