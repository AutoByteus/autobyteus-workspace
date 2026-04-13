import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useContextFileUploadStore } from '../contextFileUploadStore';
import { createUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}));

vi.mock('~/services/api', () => ({
  default: {
    post: apiPostMock,
    delete: vi.fn(),
  },
}));

describe('contextFileUploadStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('preserves uploaded display names when finalizing sanitized stored filenames', async () => {
    const store = useContextFileUploadStore();
    const draftAttachment = createUploadedContextAttachment({
      storedFilename: 'ctx_deadbeefcafe__Quarterly_notes_2026.txt',
      locator: '/rest/drafts/agent-runs/temp-agent-1/context-files/ctx_deadbeefcafe__Quarterly_notes_2026.txt',
      displayName: 'Quarterly notes 2026 ???.txt',
      phase: 'draft',
      type: 'Text',
    });

    apiPostMock.mockResolvedValue({
      data: {
        attachments: [
          {
            storedFilename: draftAttachment.storedFilename,
            displayName: draftAttachment.displayName,
            locator: '/rest/runs/run-123/context-files/ctx_deadbeefcafe__Quarterly_notes_2026.txt',
            phase: 'final',
          },
        ],
      },
    });

    const finalizedAttachments = await store.finalizeDraftAttachments({
      draftOwner: { kind: 'agent_draft', draftRunId: 'temp-agent-1' },
      finalOwner: { kind: 'agent_final', runId: 'run-123' },
      attachments: [draftAttachment],
    });

    expect(apiPostMock).toHaveBeenCalledWith('/context-files/finalize', {
      draftOwner: { kind: 'agent_draft', draftRunId: 'temp-agent-1' },
      finalOwner: { kind: 'agent_final', runId: 'run-123' },
      attachments: [
        {
          storedFilename: draftAttachment.storedFilename,
          displayName: draftAttachment.displayName,
        },
      ],
    });
    expect(finalizedAttachments).toEqual([
      expect.objectContaining({
        kind: 'uploaded',
        storedFilename: draftAttachment.storedFilename,
        displayName: 'Quarterly notes 2026 ???.txt',
        locator: '/rest/runs/run-123/context-files/ctx_deadbeefcafe__Quarterly_notes_2026.txt',
        phase: 'final',
      }),
    ]);
  });
});
