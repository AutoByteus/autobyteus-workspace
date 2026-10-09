import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import type { ContextAttachment, ContextAttachmentType, UploadedContextAttachment } from '~/types/conversation';
import {
  getDisplayNameFromStoredFilename,
  createWorkspaceContextAttachment,
  hydrateContextAttachment,
  inferContextAttachmentType,
  isDraftUploadedContextAttachment,
  parseDraftUploadedContextAttachmentLocator,
} from '~/utils/contextFiles/contextAttachmentModel';
import { contextAttachmentPresentation } from '~/utils/contextFiles/contextAttachmentPresentation';
import type { DraftContextFileOwnerDescriptor } from '~/utils/contextFiles/contextFileOwner';
import { resolveContextAttachmentUrl } from '~/utils/contextFiles/contextAttachmentUrl';
import { authorizedFetch } from '~/utils/remoteAccess/authorizedTransport';

export type ContextAttachmentComposerTarget<TSubject> = {
  key: string;
  subject: TSubject;
  attachments: ContextAttachment[];
  draftOwner: DraftContextFileOwnerDescriptor | null;
};

type UploadPlaceholder = {
  key: string;
  targetKey: string;
  label: string;
  type: ContextAttachmentType;
  previewUrl: string | null;
};

/** A failed attach/remove (or an attach the target cannot accept), shown in this composer only. */
export type ContextAttachmentComposerError =
  | { kind: 'upload_failed' | 'remove_failed'; fileNames: string[]; detail: string | null }
  | { kind: 'uploads_unavailable' };

export type ContextAttachmentComposerDisplayItem = {
  key: string;
  label: string;
  type: ContextAttachmentType;
  previewUrl: string | null;
  isUploading: boolean;
  attachment?: ContextAttachment;
  index?: number;
};

const buildUploadKey = (): string =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? `upload:${globalThis.crypto.randomUUID()}`
    : `upload:${Date.now()}-${Math.random()}`;

const sameAttachment = (left: ContextAttachment, right: ContextAttachment): boolean =>
  contextAttachmentPresentation.getKey(left) === contextAttachmentPresentation.getKey(right);

const sameDraftOwner = (
  left: DraftContextFileOwnerDescriptor,
  right: DraftContextFileOwnerDescriptor,
): boolean => {
  switch (left.kind) {
    case 'agent_draft':
      return right.kind === left.kind && right.draftRunId === left.draftRunId;
    case 'team_member_draft':
      return right.kind === left.kind
        && right.teamDraftId === left.teamDraftId
        && right.memberAddress === left.memberAddress;
    case 'org_member_draft':
      return right.kind === left.kind && right.orgRunId === left.orgRunId && right.agentRunId === left.agentRunId;
    case 'agent_collaboration_member_draft':
      return right.kind === left.kind && right.hostRunId === left.hostRunId && right.agentRunId === left.agentRunId;
    default: {
      const unsupported: never = left;
      throw new Error(`Unsupported draft owner kind '${(unsupported as { kind: string }).kind}'.`);
    }
  }
};

/** Only the composer whose upload owner created a draft deletes its server copy. */
const isOwnDraftAttachment = (
  attachment: ContextAttachment,
  draftOwner: DraftContextFileOwnerDescriptor | null,
): attachment is UploadedContextAttachment => {
  if (!draftOwner || !isDraftUploadedContextAttachment(attachment)) {
    return false;
  }
  const parsedDraft = parseDraftUploadedContextAttachmentLocator(attachment.locator);
  return parsedDraft !== null && sameDraftOwner(parsedDraft.owner, draftOwner);
};

const errorDetail = (error: unknown): string | null => {
  const candidate = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
    ?? (error instanceof Error ? error.message : null);
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
};

export function useContextAttachmentComposer<TSubject>(options: {
  getCurrentTarget: () => ContextAttachmentComposerTarget<TSubject> | null;
  commitAttachments: (
    target: ContextAttachmentComposerTarget<TSubject>,
    updater: (current: ContextAttachment[]) => ContextAttachment[],
  ) => void;
  openWorkspaceFile: (locator: string, workspaceId: string | null) => void;
  getWorkspaceId: () => string | null;
  getIsEmbeddedElectronRuntime: () => boolean;
}) {
  const contextFileUploadStore = useContextFileUploadStore();
  const failedPreviewKeys = ref(new Set<string>());
  const uploadPlaceholders = ref<UploadPlaceholder[]>([]);
  /** The last attach/remove outcome error, kept with the target it happened on. */
  const errorState = ref<{ targetKey: string; error: ContextAttachmentComposerError } | null>(null);
  const attachmentError = computed<ContextAttachmentComposerError | null>(() =>
    errorState.value && errorState.value.targetKey === options.getCurrentTarget()?.key ? errorState.value.error : null,
  );

  /** Uploads need the target's draft owner; path attachments do not. */
  const canUpload = computed(() => Boolean(options.getCurrentTarget()?.draftOwner));

  const setAttachmentError = (
    target: ContextAttachmentComposerTarget<TSubject>,
    error: ContextAttachmentComposerError | null,
  ): void => {
    if (error) {
      errorState.value = { targetKey: target.key, error };
    } else if (errorState.value?.targetKey === target.key) {
      errorState.value = null;
    }
  };

  const reportFailure = (
    target: ContextAttachmentComposerTarget<TSubject>,
    kind: 'upload_failed' | 'remove_failed',
    failures: Array<{ fileName: string; error: unknown }>,
  ): void => {
    for (const failure of failures) {
      console.error(`Context file ${kind === 'upload_failed' ? 'upload' : 'removal'} failed for '${failure.fileName}':`, failure.error);
    }
    setAttachmentError(target, {
      kind,
      fileNames: failures.map((failure) => failure.fileName),
      detail: failures.map((failure) => errorDetail(failure.error)).find((detail) => detail !== null) ?? null,
    });
  };

  const resolveAttachmentPreviewUrl = (attachment: ContextAttachment): string | null =>
    contextAttachmentPresentation.resolveImagePreviewUrl(attachment, {
      workspaceId: options.getWorkspaceId(),
      isEmbeddedElectronRuntime: options.getIsEmbeddedElectronRuntime(),
      failedKeys: failedPreviewKeys.value,
    });

  const displayedItems = computed<ContextAttachmentComposerDisplayItem[]>(() => {
    const target = options.getCurrentTarget();
    if (!target) {
      return [];
    }

    const attachments = target.attachments.map((attachment, index) => ({
      key: contextAttachmentPresentation.getKey(attachment),
      label: contextAttachmentPresentation.getDisplayLabel(attachment),
      type: attachment.type,
      previewUrl: resolveAttachmentPreviewUrl(attachment),
      isUploading: false,
      attachment,
      index,
    }));

    const placeholders = uploadPlaceholders.value
      .filter((placeholder) => placeholder.targetKey === target.key)
      .map((placeholder) => ({
        key: placeholder.key,
        label: placeholder.label,
        type: placeholder.type,
        previewUrl: placeholder.previewUrl,
        isUploading: true,
      }));

    return [...attachments, ...placeholders];
  });

  const thumbnailItems = computed(() =>
    displayedItems.value.filter((item) => item.type === 'Image' && item.previewUrl),
  );
  const regularItems = computed(() =>
    displayedItems.value.filter((item) => item.type !== 'Image' || !item.previewUrl),
  );

  const commitTargetAttachments = (
    target: ContextAttachmentComposerTarget<TSubject>,
    updater: (current: ContextAttachment[]) => ContextAttachment[],
  ): void => {
    options.commitAttachments(target, (current) => updater([...current]));
  };

  const appendWorkspaceLocators = (
    locators: string[],
    target: ContextAttachmentComposerTarget<TSubject> | null = options.getCurrentTarget(),
  ): void => {
    const nextAttachments = locators
      .map((value) => value.trim())
      .filter(Boolean)
      .map((locator) => createWorkspaceContextAttachment(locator, inferContextAttachmentType(locator)));
    appendAttachments(nextAttachments, target);
  };

  const appendAttachments = (
    attachments: ContextAttachment[],
    target: ContextAttachmentComposerTarget<TSubject> | null = options.getCurrentTarget(),
  ): void => {
    if (!target || attachments.length === 0) {
      return;
    }

    setAttachmentError(target, null);
    commitTargetAttachments(target, (current) => {
      const nextAttachments = [...current];
      const existingKeys = new Set(nextAttachments.map((attachment) => contextAttachmentPresentation.getKey(attachment)));
      const existingLocators = new Set(nextAttachments.map((attachment) => attachment.locator));

      for (const attachment of attachments) {
        if (
          existingKeys.has(contextAttachmentPresentation.getKey(attachment)) ||
          existingLocators.has(attachment.locator)
        ) {
          continue;
        }
        nextAttachments.push(attachment);
        existingKeys.add(contextAttachmentPresentation.getKey(attachment));
        existingLocators.add(attachment.locator);
      }

      return nextAttachments;
    });
  };

  const cloneDraftAttachmentToTarget = async (
    attachment: UploadedContextAttachment,
    draftOwner: DraftContextFileOwnerDescriptor,
  ): Promise<UploadedContextAttachment> => {
    const response = await authorizedFetch(resolveContextAttachmentUrl(attachment.locator));
    if (!response.ok) {
      throw new Error(`Failed to fetch pasted draft attachment '${attachment.locator}' (${response.status}).`);
    }

    const blob = await response.blob();
    const file = new File(
      [blob],
      attachment.displayName || getDisplayNameFromStoredFilename(attachment.storedFilename),
      { type: blob.type || undefined },
    );
    return contextFileUploadStore.uploadAttachment({ owner: draftOwner, file });
  };

  const appendLocatorAttachments = async (
    locators: string[],
    target: ContextAttachmentComposerTarget<TSubject> | null = options.getCurrentTarget(),
  ): Promise<void> => {
    if (!target) {
      return;
    }

    const attachmentsToAppend: ContextAttachment[] = [];
    const failedClones: Array<{ fileName: string; error: unknown }> = [];
    for (const locator of locators.map((value) => value.trim()).filter(Boolean)) {
      const hydratedAttachment = hydrateContextAttachment({ locator });

      if (isDraftUploadedContextAttachment(hydratedAttachment) && target.draftOwner) {
        const parsedDraft = parseDraftUploadedContextAttachmentLocator(hydratedAttachment.locator);
        if (parsedDraft && !sameDraftOwner(parsedDraft.owner, target.draftOwner)) {
          try {
            attachmentsToAppend.push(
              await cloneDraftAttachmentToTarget(hydratedAttachment, target.draftOwner),
            );
          } catch (error) {
            failedClones.push({ fileName: contextAttachmentPresentation.getDisplayLabel(hydratedAttachment), error });
          }
          continue;
        }
      }

      attachmentsToAppend.push(hydratedAttachment);
    }

    appendAttachments(attachmentsToAppend, target);
    if (failedClones.length > 0) {
      reportFailure(target, 'upload_failed', failedClones);
    }
  };

  const revokePreviewUrl = (previewUrl: string | null): void => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const removeUploadPlaceholder = (key: string): void => {
    const placeholder = uploadPlaceholders.value.find((item) => item.key === key);
    revokePreviewUrl(placeholder?.previewUrl ?? null);
    uploadPlaceholders.value = uploadPlaceholders.value.filter((item) => item.key !== key);
  };

  const uploadFiles = async (
    files: File[],
    target: ContextAttachmentComposerTarget<TSubject> | null = options.getCurrentTarget(),
  ): Promise<void> => {
    if (!target || files.length === 0) {
      return;
    }
    if (!target.draftOwner) {
      setAttachmentError(target, { kind: 'uploads_unavailable' });
      return;
    }
    const draftOwner = target.draftOwner;
    const failedUploads: Array<{ fileName: string; error: unknown }> = [];

    await Promise.all(
      files.map(async (file) => {
        const type = inferContextAttachmentType(file);
        const key = buildUploadKey();
        const previewUrl = type === 'Image' ? URL.createObjectURL(file) : null;

        uploadPlaceholders.value = [
          ...uploadPlaceholders.value,
          {
            key,
            targetKey: target.key,
            label: file.name,
            type,
            previewUrl,
          },
        ];

        try {
          const attachment = await contextFileUploadStore.uploadAttachment({ owner: draftOwner, file });
          commitTargetAttachments(target, (current) => {
            if (current.some((existingAttachment) => sameAttachment(existingAttachment, attachment))) {
              return current;
            }
            return [...current, attachment];
          });
        } catch (error) {
          failedUploads.push({ fileName: file.name, error });
        } finally {
          removeUploadPlaceholder(key);
        }
      }),
    );

    if (failedUploads.length > 0) {
      reportFailure(target, 'upload_failed', failedUploads);
    } else {
      setAttachmentError(target, null);
    }
  };

  const openAttachment = (attachment: ContextAttachment): void => {
    contextAttachmentPresentation.openAttachment(attachment, {
      workspaceId: options.getWorkspaceId(),
      isEmbeddedElectronRuntime: options.getIsEmbeddedElectronRuntime(),
      openWorkspaceFile: options.openWorkspaceFile,
    });
  };

  const removeItem = async (
    item: ContextAttachmentComposerDisplayItem,
    target: ContextAttachmentComposerTarget<TSubject> | null = options.getCurrentTarget(),
  ): Promise<void> => {
    if (item.isUploading || !item.attachment || !target) {
      return;
    }
    const removedAttachment = item.attachment;

    // A foreign or owner-less draft leaves this composer only; its owner keeps the file.
    if (isOwnDraftAttachment(removedAttachment, target.draftOwner)) {
      try {
        await contextFileUploadStore.deleteDraftAttachment(removedAttachment);
      } catch (error) {
        reportFailure(target, 'remove_failed', [{ fileName: item.label, error }]);
        return;
      }
    }

    commitTargetAttachments(target, (current) => {
      const nextAttachments = [...current];
      const targetIndex = nextAttachments.findIndex((attachment) => sameAttachment(attachment, removedAttachment));
      if (targetIndex >= 0) {
        nextAttachments.splice(targetIndex, 1);
      }
      return nextAttachments;
    });
    setAttachmentError(target, null);
  };

  const clearCurrentTargetAttachments = async (): Promise<void> => {
    const target = options.getCurrentTarget();
    if (!target) {
      return;
    }

    const retainedAttachments: ContextAttachment[] = [];
    const failedRemovals: Array<{ fileName: string; error: unknown }> = [];

    for (const attachment of [...target.attachments]) {
      if (!isOwnDraftAttachment(attachment, target.draftOwner)) {
        continue;
      }
      try {
        await contextFileUploadStore.deleteDraftAttachment(attachment);
      } catch (error) {
        retainedAttachments.push(attachment);
        failedRemovals.push({ fileName: contextAttachmentPresentation.getDisplayLabel(attachment), error });
      }
    }

    commitTargetAttachments(target, () => retainedAttachments);
    if (failedRemovals.length > 0) {
      reportFailure(target, 'remove_failed', failedRemovals);
    } else {
      setAttachmentError(target, null);
    }
  };

  const markImagePreviewAsFailed = (key: string): void => {
    if (failedPreviewKeys.value.has(key)) {
      return;
    }
    failedPreviewKeys.value = new Set([...failedPreviewKeys.value, key]);
  };

  watch(
    () => displayedItems.value.map((item) => item.key),
    (itemKeys) => {
      const activeKeys = new Set(itemKeys);
      const nextFailedKeys = Array.from(failedPreviewKeys.value).filter((key) => activeKeys.has(key));
      if (nextFailedKeys.length !== failedPreviewKeys.value.size) {
        failedPreviewKeys.value = new Set(nextFailedKeys);
      }
    },
    { deep: false },
  );

  watch(
    () => options.getCurrentTarget()?.key ?? null,
    () => {
      errorState.value = null;
    },
  );

  onBeforeUnmount(() => {
    for (const placeholder of uploadPlaceholders.value) {
      revokePreviewUrl(placeholder.previewUrl);
    }
  });

  return {
    displayedItems,
    thumbnailItems,
    regularItems,
    attachmentError,
    canUpload,
    appendAttachments,
    appendLocatorAttachments,
    appendWorkspaceLocators,
    uploadFiles,
    openAttachment,
    removeItem,
    clearCurrentTargetAttachments,
    markImagePreviewAsFailed,
  };
}
