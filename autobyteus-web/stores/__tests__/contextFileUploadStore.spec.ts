import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, CanceledError } from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { ContextFileUploadError } from '~/utils/contextFiles/contextFileUploadFailure';
import { useContextFileUploadStore } from '../contextFileUploadStore';
import {
  createUploadedContextAttachment,
  createWorkspaceContextAttachment,
} from '~/utils/contextFiles/contextAttachmentModel';

const { apiPostMock, apiGetMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  apiGetMock: vi.fn(),
}));

vi.mock('~/services/api', () => ({
  default: {
    post: apiPostMock,
    get: apiGetMock,
  },
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ initialized: true, nodeBaseUrl: 'http://127.0.0.1:31000/' }),
}));

describe('contextFileUploadStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  const orgMemberDraft = createUploadedContextAttachment({
    storedFilename: 'ctx_cafe__screen shot.png',
    locator: '/rest/drafts/agent-org-runs/org-1/agent-runs/member-1/context-files/ctx_cafe__screen%20shot.png',
    displayName: 'screen shot.png',
    phase: 'draft',
    type: 'Image',
  });

  it('deletes a draft at its own locator on the bound node and counts the request as in flight', async () => {
    const store = useContextFileUploadStore();
    let inFlightDuringRequest = false;
    const fetchMock = vi.fn(async () => {
      inFlightDuringRequest = store.isUploading;
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await store.deleteDraftAttachment(orgMemberDraft);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:31000/rest/drafts/agent-org-runs/org-1/agent-runs/member-1/context-files/ctx_cafe__screen%20shot.png',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(inFlightDuringRequest).toBe(true);
    expect(store.isUploading).toBe(false);
  });

  it('throws the server detail when a draft delete fails', async () => {
    const store = useContextFileUploadStore();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'agentRunId must be a safe non-empty identity.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(store.deleteDraftAttachment(orgMemberDraft)).rejects.toThrow('agentRunId must be a safe non-empty identity.');
    expect(store.isUploading).toBe(false);

    vi.stubGlobal('fetch', vi.fn(async () => new Response('gateway down', { status: 502 })));
    await expect(store.deleteDraftAttachment(orgMemberDraft)).rejects.toThrow('Delete failed (502).');
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

  it('finalizes draft locators even when attachment metadata was downgraded to a plain path', async () => {
    const store = useContextFileUploadStore();
    const draftLocator = '/rest/drafts/agent-runs/temp-agent-1/context-files/ctx_deadbeefcafe__diagram.png';
    const downgradedAttachment = createWorkspaceContextAttachment(draftLocator, 'Image');

    apiPostMock.mockResolvedValue({
      data: {
        attachments: [
          {
            storedFilename: 'ctx_deadbeefcafe__diagram.png',
            displayName: 'diagram.png',
            locator: '/rest/runs/run-123/context-files/ctx_deadbeefcafe__diagram.png',
            phase: 'final',
          },
        ],
      },
    });

    const finalizedAttachments = await store.finalizeDraftAttachments({
      draftOwner: { kind: 'agent_draft', draftRunId: 'temp-agent-1' },
      finalOwner: { kind: 'agent_final', runId: 'run-123' },
      attachments: [downgradedAttachment],
    });

    expect(apiPostMock).toHaveBeenCalledWith('/context-files/finalize', {
      draftOwner: { kind: 'agent_draft', draftRunId: 'temp-agent-1' },
      finalOwner: { kind: 'agent_final', runId: 'run-123' },
      attachments: [
        {
          storedFilename: 'ctx_deadbeefcafe__diagram.png',
          displayName: 'ctx_deadbeefcafe__diagram.png',
        },
      ],
    });
    expect(finalizedAttachments).toEqual([
      expect.objectContaining({
        kind: 'uploaded',
        storedFilename: 'ctx_deadbeefcafe__diagram.png',
        displayName: 'diagram.png',
        locator: '/rest/runs/run-123/context-files/ctx_deadbeefcafe__diagram.png',
        phase: 'final',
      }),
    ]);
  });

  describe('size limits, progress and cancel', () => {
    const owner = { kind: 'agent_draft', draftRunId: 'temp-1' } as const;
    const video = new File(['v'], 'VID_1.mp4', { type: 'video/mp4' });
    const refusal = (status: number | undefined, data?: unknown) => {
      const error = new AxiosError('Request failed');
      if (status !== undefined) error.response = { status, data, statusText: '', headers: {}, config: {} as never };
      return error;
    };

    it('reads the node\'s published limits, counted as in flight', async () => {
      const store = useContextFileUploadStore();
      let inFlight = false;
      apiGetMock.mockImplementation(async () => {
        inFlight = store.isUploading;
        return { data: { otherFileMaxBytes: 26214400, audioVideoMaxBytes: 2147483648, audioVideoMimeTypes: ['video/mp4'] } };
      });
      await expect(store.readSizeLimits()).resolves.toEqual({
        otherFileMaxBytes: 26214400, audioVideoMaxBytes: 2147483648, audioVideoMimeTypes: ['video/mp4'],
      });
      expect(apiGetMock).toHaveBeenCalledWith('/context-files/size-limits');
      expect(inFlight).toBe(true);
      expect(store.isUploading).toBe(false);
    });

    it('reports a failed limits read as the same typed failures an upload has', async () => {
      const store = useContextFileUploadStore();
      apiGetMock.mockRejectedValueOnce(refusal(undefined));
      await expect(store.readSizeLimits()).rejects.toMatchObject({ failure: { reason: 'interrupted' } });
      apiGetMock.mockResolvedValueOnce({ data: { nonsense: true } });
      await expect(store.readSizeLimits()).rejects.toMatchObject({ failure: { reason: 'other' } });
      expect(store.isUploading).toBe(false);
    });

    it('passes the abort signal and reports whole-percent progress', async () => {
      const store = useContextFileUploadStore();
      const controller = new AbortController();
      const percents: number[] = [];
      apiPostMock.mockImplementation(async (_url, _body, config) => {
        config.onUploadProgress({ loaded: 50, total: 200 });
        config.onUploadProgress({ loaded: 1, total: undefined });
        config.onUploadProgress({ loaded: 200, total: 200 });
        return { data: { storedFilename: 'ctx_a__VID_1.mp4', locator: '/rest/drafts/agent-runs/temp-1/context-files/ctx_a__VID_1.mp4', displayName: 'VID_1.mp4', phase: 'draft' } };
      });
      await store.uploadAttachment({ owner, file: video, signal: controller.signal, onProgress: (p) => percents.push(p) });
      expect(apiPostMock.mock.calls[0]![2].signal).toBe(controller.signal);
      expect(percents).toEqual([25, 100]);
    });

    it('translates every refusal to a typed failure and never exposes the response body', async () => {
      const store = useContextFileUploadStore();
      const expectFailure = async (error: unknown, failure: object) => {
        apiPostMock.mockRejectedValueOnce(error);
        const thrown = await store.uploadAttachment({ owner, file: video }).catch((e) => e);
        expect(thrown).toBeInstanceOf(ContextFileUploadError);
        expect(thrown.failure).toEqual(failure);
      };
      await expectFailure(refusal(413, { code: 'CONTEXT_FILE_TOO_LARGE', detail: 'Uploaded file is too large.', maxBytes: 26214400 }), { reason: 'too_large', maxBytes: 26214400 });
      await expectFailure(refusal(415, { code: 'CONTEXT_FILE_TYPE_UNSUPPORTED', detail: 'Unsupported file type: x' }), { reason: 'unsupported_type' });
      await expectFailure(refusal(undefined), { reason: 'interrupted' });
      await expectFailure(refusal(400, { detail: 'owner is required.' }), { reason: 'other' });
      expect(store.isUploading).toBe(false);
    });

    it('rethrows the cancellation of its own aborted request untouched', async () => {
      const store = useContextFileUploadStore();
      const controller = new AbortController();
      apiPostMock.mockImplementation(async () => { controller.abort(); throw new CanceledError(); });
      const thrown = await store.uploadAttachment({ owner, file: video, signal: controller.signal }).catch((e) => e);
      expect(thrown).toBeInstanceOf(CanceledError);
      expect(store.isUploading).toBe(false);
    });
  });
});
