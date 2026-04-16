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
import { getServerBaseUrl } from '~/utils/serverConfig';

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
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === 'agent_draft' && right.kind === 'agent_draft') {
    return left.draftRunId === right.draftRunId;
  }
  return (
    left.draftTeamRunId === right.draftTeamRunId &&
    left.memberRouteKey === right.memberRouteKey
  );
};

const resolveAttachmentFetchUrl = (locator: string): string => {
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(locator)) {
    return locator;
  }

  const baseUrl = getServerBaseUrl().replace(/\/$/, '');
  if (locator.startsWith('/')) {
    return `${baseUrl}${locator}`;
  }

  return `${baseUrl}/${locator}`;
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
    const response = await fetch(resolveAttachmentFetchUrl(attachment.locator));
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
    for (const locator of locators.map((value) => value.trim()).filter(Boolean)) {
      const hydratedAttachment = hydrateContextAttachment({ locator });

      if (isDraftUploadedContextAttachment(hydratedAttachment) && target.draftOwner) {
        const parsedDraft = parseDraftUploadedContextAttachmentLocator(hydratedAttachment.locator);
        if (parsedDraft && !sameDraftOwner(parsedDraft.owner, target.draftOwner)) {
          try {
            attachmentsToAppend.push(
              await cloneDraftAttachmentToTarget(hydratedAttachment, target.draftOwner),
            );
            continue;
          } catch (error) {
            console.error('Failed to clone pasted draft context file:', error);
            continue;
          }
        }
      }

      attachmentsToAppend.push(hydratedAttachment);
    }

    appendAttachments(attachmentsToAppend, target);
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
    if (!target || !target.draftOwner || files.length === 0) {
      return;
    }

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
          const attachment = await contextFileUploadStore.uploadAttachment({ owner: target.draftOwner, file });
          commitTargetAttachments(target, (current) => {
            if (current.some((existingAttachment) => sameAttachment(existingAttachment, attachment))) {
              return current;
            }
            return [...current, attachment];
          });
        } catch (error) {
          console.error('Error uploading context file:', error);
        } finally {
          removeUploadPlaceholder(key);
        }
      }),
    );
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

    if (isDraftUploadedContextAttachment(item.attachment)) {
      if (!target.draftOwner) {
        console.warn('Cannot delete draft context file without an active owner.');
        return;
      }
      try {
        await contextFileUploadStore.deleteDraftAttachment({
          owner: target.draftOwner,
          attachment: item.attachment,
        });
      } catch (error) {
        console.error('Error deleting draft context file:', error);
        return;
      }
    }

    commitTargetAttachments(target, (current) => {
      const nextAttachments = [...current];
      const targetIndex = nextAttachments.findIndex((attachment) => sameAttachment(attachment, item.attachment!));
      if (targetIndex >= 0) {
        nextAttachments.splice(targetIndex, 1);
      }
      return nextAttachments;
    });
  };

  const clearCurrentTargetAttachments = async (): Promise<void> => {
    const target = options.getCurrentTarget();
    if (!target) {
      return;
    }

    const failedDeletionAttachments: ContextAttachment[] = [];

    for (const attachment of [...target.attachments]) {
      if (!isDraftUploadedContextAttachment(attachment)) {
        continue;
      }

      if (!target.draftOwner) {
        failedDeletionAttachments.push(attachment);
        continue;
      }

      try {
        await contextFileUploadStore.deleteDraftAttachment({ owner: target.draftOwner, attachment });
      } catch (error) {
        console.error('Error deleting draft context file during clear:', error);
        failedDeletionAttachments.push(attachment);
      }
    }

    commitTargetAttachments(target, () => failedDeletionAttachments);
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

  onBeforeUnmount(() => {
    for (const placeholder of uploadPlaceholders.value) {
      revokePreviewUrl(placeholder.previewUrl);
    }
  });

  return {
    displayedItems,
    thumbnailItems,
    regularItems,
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
