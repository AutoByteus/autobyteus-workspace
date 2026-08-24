import { defineStore } from 'pinia';
import apiService from '~/services/api';
import type { ContextAttachment, UploadedContextAttachment } from '~/types/conversation';
import {
  coerceDraftUploadedContextAttachment,
  createUploadedContextAttachment,
  inferContextAttachmentType,
  isDraftUploadedContextAttachment,
} from '~/utils/contextFiles/contextAttachmentModel';
import {
  buildDraftContextFileEndpoint,
  type DraftContextFileOwnerDescriptor,
  type FinalContextFileOwnerDescriptor,
} from '~/utils/contextFiles/contextFileOwner';

interface UploadDraftResponse {
  storedFilename: string;
  displayName: string;
  locator: string;
  phase: 'draft';
}

interface FinalizeDraftResponse {
  attachments: Array<{
    storedFilename: string;
    displayName: string;
    locator: string;
    phase: 'final';
  }>;
}

interface ContextFileUploadState {
  activeRequestCount: number;
  error: string | null;
}

export const useContextFileUploadStore = defineStore('contextFileUpload', {
  state: (): ContextFileUploadState => ({
    activeRequestCount: 0,
    error: null,
  }),

  getters: {
    isUploading: (state): boolean => state.activeRequestCount > 0,
  },

  actions: {
    async uploadAttachment(input: {
      owner: DraftContextFileOwnerDescriptor;
      file: File;
    }): Promise<UploadedContextAttachment> {
      this.activeRequestCount += 1;
      this.error = null;
      const formData = new FormData();
      formData.append('owner', JSON.stringify(input.owner));
      formData.append('file', input.file);

      try {
        const response = await apiService.post<UploadDraftResponse>('/context-files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return createUploadedContextAttachment({
          storedFilename: response.data.storedFilename,
          locator: response.data.locator,
          displayName: response.data.displayName || input.file.name,
          phase: 'draft',
          type: inferContextAttachmentType(input.file),
        });
      } catch (error: any) {
        this.error = error?.response?.data?.detail || error?.message || 'Failed to upload context attachment.';
        throw error;
      } finally {
        this.activeRequestCount -= 1;
      }
    },

    async deleteDraftAttachment(input: {
      owner: DraftContextFileOwnerDescriptor;
      attachment: ContextAttachment;
    }): Promise<void> {
      if (!isDraftUploadedContextAttachment(input.attachment)) {
        return;
      }

      this.activeRequestCount += 1;
      this.error = null;
      try {
        await apiService.delete(buildDraftContextFileEndpoint(input.owner, input.attachment.storedFilename));
      } catch (error: any) {
        this.error = error?.response?.data?.detail || error?.message || 'Failed to delete draft attachment.';
        throw error;
      } finally {
        this.activeRequestCount -= 1;
      }
    },

    async finalizeDraftAttachments(input: {
      draftOwner: DraftContextFileOwnerDescriptor;
      finalOwner: FinalContextFileOwnerDescriptor;
      attachments: ContextAttachment[];
    }): Promise<ContextAttachment[]> {
      const draftUploadedAttachments = input.attachments
        .map((attachment) =>
          isDraftUploadedContextAttachment(attachment)
            ? attachment
            : coerceDraftUploadedContextAttachment(attachment),
        )
        .filter((attachment): attachment is UploadedContextAttachment => attachment !== null);
      if (draftUploadedAttachments.length === 0) {
        return input.attachments;
      }

      this.activeRequestCount += 1;
      this.error = null;
      try {
        const response = await apiService.post<FinalizeDraftResponse>('/context-files/finalize', {
          draftOwner: input.draftOwner,
          finalOwner: input.finalOwner,
          attachments: draftUploadedAttachments.map((attachment) => ({
            storedFilename: attachment.storedFilename,
            displayName: attachment.displayName,
          })),
        });

        const finalizedByStoredFilename = new Map(
          response.data.attachments.map((attachment) => [attachment.storedFilename, attachment]),
        );

        return input.attachments.map((attachment) => {
          const draftAttachment = isDraftUploadedContextAttachment(attachment)
            ? attachment
            : coerceDraftUploadedContextAttachment(attachment);
          if (!draftAttachment) {
            return attachment;
          }

          const finalized = finalizedByStoredFilename.get(draftAttachment.storedFilename);
          if (!finalized) {
            throw new Error(`Finalized attachment '${draftAttachment.storedFilename}' was not returned by the server.`);
          }

          return createUploadedContextAttachment({
            storedFilename: draftAttachment.storedFilename,
            locator: finalized.locator,
            displayName: finalized.displayName || draftAttachment.displayName,
            phase: 'final',
            type: draftAttachment.type,
          });
        });
      } catch (error: any) {
        this.error = error?.response?.data?.detail || error?.message || 'Failed to finalize draft attachments.';
        throw error;
      } finally {
        this.activeRequestCount -= 1;
      }
    },
  },
});
