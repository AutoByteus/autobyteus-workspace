import { defineStore } from 'pinia';
import apiService from '~/services/api';
import type { ContextAttachment, UploadedContextAttachment } from '~/types/conversation';
import {
  coerceDraftUploadedContextAttachment,
  createUploadedContextAttachment,
  inferContextAttachmentType,
  isDraftUploadedContextAttachment,
} from '~/utils/contextFiles/contextAttachmentModel';
import type {
  DraftContextFileOwnerDescriptor,
  FinalContextFileOwnerDescriptor,
} from '~/utils/contextFiles/contextFileOwner';
import { resolveContextAttachmentUrl } from '~/utils/contextFiles/contextAttachmentUrl';
import { authorizedFetch } from '~/utils/remoteAccess/authorizedTransport';

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
}

const readErrorDetail = async (response: Response): Promise<string | null> => {
  try {
    const body = await response.json() as { detail?: unknown };
    return typeof body?.detail === 'string' && body.detail ? body.detail : null;
  } catch {
    return null;
  }
};

export const useContextFileUploadStore = defineStore('contextFileUpload', {
  state: (): ContextFileUploadState => ({
    activeRequestCount: 0,
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
      } finally {
        this.activeRequestCount -= 1;
      }
    },

    /** Deletes a draft upload at its own locator, whichever owner kind it belongs to. */
    async deleteDraftAttachment(attachment: UploadedContextAttachment): Promise<void> {
      this.activeRequestCount += 1;
      try {
        const response = await authorizedFetch(resolveContextAttachmentUrl(attachment.locator), { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(await readErrorDetail(response) ?? `Delete failed (${response.status}).`);
        }
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
      } finally {
        this.activeRequestCount -= 1;
      }
    },
  },
});
