import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import type { ContextAttachment } from '~/types/conversation';
import type { DraftContextFileOwnerDescriptor } from '~/utils/contextFiles/contextFileOwner';
import { createUploadedContextAttachment, hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import {
  useContextAttachmentComposer,
  type ContextAttachmentComposerTarget,
} from '../useContextAttachmentComposer';
import { ContextFileUploadError } from '~/utils/contextFiles/contextFileUploadFailure';

const uploadStoreMock = vi.hoisted(() => ({
  isUploading: false,
  readSizeLimits: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteDraftAttachment: vi.fn(),
}));

vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => uploadStoreMock,
}));

type DraftOwnerKind = DraftContextFileOwnerDescriptor['kind'];

/**
 * Every draft owner kind with the exact locator the server builds for it
 * (`buildDraftContextFileLocator`), including an encoded nested Team member address.
 */
const SERVER_DRAFTS: { [K in DraftOwnerKind]: { owner: Extract<DraftContextFileOwnerDescriptor, { kind: K }>; locator: string } } = {
  agent_draft: {
    owner: { kind: 'agent_draft', draftRunId: 'temp-agent-1' },
    locator: '/rest/drafts/agent-runs/temp-agent-1/context-files/ctx_a1__notes.txt',
  },
  team_member_draft: {
    owner: { kind: 'team_member_draft', teamDraftId: 'team-1', memberAddress: '/delivery/lead' },
    locator: '/rest/drafts/team-runs/team-1/members/%2Fdelivery%2Flead/context-files/ctx_t1__notes.txt',
  },
  org_member_draft: {
    owner: { kind: 'org_member_draft', orgRunId: 'org-1', agentRunId: 'member-1' },
    locator: '/rest/drafts/agent-org-runs/org-1/agent-runs/member-1/context-files/ctx_o1__notes.txt',
  },
};

const mountComposer = (target: ContextAttachmentComposerTarget<null>) => {
  let composer!: ReturnType<typeof useContextAttachmentComposer<null>>;
  mount(defineComponent({
    setup() {
      composer = useContextAttachmentComposer<null>({
        getCurrentTarget: () => target,
        commitAttachments: (current, updater) => {
          current.attachments = updater(current.attachments);
        },
        openWorkspaceFile: vi.fn(),
        getWorkspaceId: () => null,
        getIsEmbeddedElectronRuntime: () => false,
      });
      return () => null;
    },
  }));
  return composer;
};

describe('useContextAttachmentComposer draft removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadStoreMock.deleteDraftAttachment.mockResolvedValue(undefined);
  });

  it('covers every draft owner kind', () => {
    expect(Object.keys(SERVER_DRAFTS).sort()).toEqual([
      'agent_draft', 'org_member_draft', 'team_member_draft',
    ]);
  });

  it.each(Object.values(SERVER_DRAFTS))('deletes its own $owner.kind draft at the server locator', async ({ owner, locator }) => {
    const attachment = hydrateContextAttachment({ locator });
    const target = reactive({ key: owner.kind, subject: null, attachments: [attachment] as ContextAttachment[], draftOwner: owner });
    const composer = mountComposer(target);

    await composer.removeItem(composer.displayedItems.value[0]!);
    await flushPromises();

    expect(uploadStoreMock.deleteDraftAttachment).toHaveBeenCalledTimes(1);
    expect(uploadStoreMock.deleteDraftAttachment.mock.calls[0]![0].locator).toBe(locator);
    expect(target.attachments).toEqual([]);
    expect(composer.attachmentError.value).toBeNull();
  });

  it.each(Object.values(SERVER_DRAFTS))('never deletes a $owner.kind draft from another composer', async ({ locator }) => {
    const attachment = hydrateContextAttachment({ locator });
    const otherOwner: DraftContextFileOwnerDescriptor = { kind: 'agent_draft', draftRunId: 'someone-else' };
    const target = reactive({ key: 'other', subject: null, attachments: [attachment] as ContextAttachment[], draftOwner: otherOwner });
    const composer = mountComposer(target);

    await composer.clearCurrentTargetAttachments();

    expect(uploadStoreMock.deleteDraftAttachment).not.toHaveBeenCalled();
    expect(target.attachments).toEqual([]);
  });
});

const MB = 1024 * 1024;
const limits = { otherFileMaxBytes: 25 * MB, audioVideoMaxBytes: 2048 * MB, audioVideoMimeTypes: ['video/mp4'] };
const draftOwner: DraftContextFileOwnerDescriptor = { kind: 'agent_draft', draftRunId: 'temp-agent-1' };
const fileOf = (name: string, type: string, size = 10) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};
const uploaded = (name: string) => createUploadedContextAttachment({
  storedFilename: `ctx_a1__${name}`,
  locator: `/rest/drafts/agent-runs/temp-agent-1/context-files/ctx_a1__${name}`,
  displayName: name, phase: 'draft', type: 'Video',
});
const newTarget = () => reactive({ key: 'target-1', subject: null, attachments: [] as ContextAttachment[], draftOwner });

describe('useContextAttachmentComposer uploads: limits, progress, cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadStoreMock.readSizeLimits.mockResolvedValue(limits);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('refuses an over-limit file before sending any byte, and uploads the others (AC-005)', async () => {
    const target = newTarget();
    const composer = mountComposer(target);
    uploadStoreMock.uploadAttachment.mockResolvedValue(uploaded('ok.mp4'));

    await composer.uploadFiles([fileOf('huge.mp4', 'video/mp4', 2049 * MB), fileOf('ok.mp4', 'video/mp4', 300 * MB)]);

    expect(uploadStoreMock.readSizeLimits).toHaveBeenCalledTimes(1);
    expect(uploadStoreMock.uploadAttachment).toHaveBeenCalledTimes(1);
    expect(uploadStoreMock.uploadAttachment.mock.calls[0]![0].file.name).toBe('ok.mp4');
    expect(target.attachments.map((a) => a.type)).toEqual(['Video']);
    expect(composer.attachmentErrorLines.value).toEqual([{
      kind: 'upload_failed',
      group: { key: `too_large:${2048 * MB}`, failure: { reason: 'too_large', maxBytes: 2048 * MB }, fileNames: ['huge.mp4'] },
    }]);
  });

  it('accepts a file exactly at its limit and refuses one byte more, each by its own type', async () => {
    const composer = mountComposer(newTarget());
    uploadStoreMock.uploadAttachment.mockResolvedValue(uploaded('x.mp4'));
    await composer.uploadFiles([fileOf('at.mp4', 'video/mp4', 2048 * MB), fileOf('at.pdf', 'application/pdf', 25 * MB)]);
    expect(uploadStoreMock.uploadAttachment).toHaveBeenCalledTimes(2);
    expect(composer.attachmentErrorLines.value).toEqual([]);

    uploadStoreMock.uploadAttachment.mockClear();
    await composer.uploadFiles([fileOf('over.mp4', 'video/mp4', 2048 * MB + 1), fileOf('over.pdf', 'application/pdf', 25 * MB + 1), fileOf('mystery', '', 26 * MB)]);
    expect(uploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
  });

  it('groups size failures by limit and every other failure by reason, one line each (AC-005, AR-002)', async () => {
    const composer = mountComposer(newTarget());
    uploadStoreMock.uploadAttachment.mockImplementation(async ({ file }: { file: File }) => {
      if (file.name === 'tool.exe') throw new ContextFileUploadError({ reason: 'unsupported_type' });
      if (file.name === 'late.mp4') throw new ContextFileUploadError({ reason: 'too_large', maxBytes: 500 * MB }); // the server's limit was lowered (AC-006)
      if (file.name === 'a.png' || file.name === 'b.png') throw new Error('Uploaded file is too large.');
      throw new Error('unexpected');
    });
    await composer.uploadFiles([
      fileOf('a.mp4', 'video/mp4', 3000 * MB), fileOf('b.pdf', 'application/pdf', 30 * MB), fileOf('c.mp4', 'video/mp4', 4000 * MB),
      fileOf('tool.exe', 'application/octet-stream'), fileOf('late.mp4', 'video/mp4'), fileOf('a.png', 'image/png'), fileOf('b.png', 'image/png'),
    ]);

    expect(composer.attachmentErrorLines.value.map((line) => line.kind === 'upload_failed' ? [line.group.key, line.group.fileNames] : line.kind)).toEqual([
      [`too_large:${2048 * MB}`, ['a.mp4', 'c.mp4']],
      [`too_large:${25 * MB}`, ['b.pdf']],
      ['unsupported_type', ['tool.exe']],
      [`too_large:${500 * MB}`, ['late.mp4']],
      ['other', ['a.png', 'b.png']],
    ]);
    // The raw error goes to the console only.
    expect(console.error).toHaveBeenCalled();
  });

  it('maps a lost connection to "interrupted" and a failed limits read to a failure per picked file', async () => {
    const composer = mountComposer(newTarget());
    uploadStoreMock.uploadAttachment.mockRejectedValue(new ContextFileUploadError({ reason: 'interrupted' }));
    await composer.uploadFiles([fileOf('a.mp4', 'video/mp4')]);
    expect(composer.attachmentErrorLines.value).toMatchObject([{ kind: 'upload_failed', group: { key: 'interrupted', fileNames: ['a.mp4'] } }]);

    uploadStoreMock.uploadAttachment.mockClear();
    uploadStoreMock.readSizeLimits.mockRejectedValue(new ContextFileUploadError({ reason: 'interrupted' }));
    await composer.uploadFiles([fileOf('b.mp4', 'video/mp4'), fileOf('c.pdf', 'application/pdf')]);
    expect(uploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
    expect(composer.attachmentErrorLines.value).toMatchObject([{ group: { key: 'interrupted', fileNames: ['b.mp4', 'c.pdf'] } }]);
  });

  it('shows progress on the uploading item and clears the item when done', async () => {
    const composer = mountComposer(newTarget());
    let report!: (percent: number) => void;
    let finish!: (value: unknown) => void;
    uploadStoreMock.uploadAttachment.mockImplementation(({ onProgress }: { onProgress: (p: number) => void }) => {
      report = onProgress;
      return new Promise((resolve) => { finish = resolve; });
    });
    const pending = composer.uploadFiles([fileOf('a.mp4', 'video/mp4')]);
    await flushPromises();
    expect(composer.displayedItems.value).toMatchObject([{ label: 'a.mp4', isUploading: true, progress: 0 }]);
    report(42);
    await flushPromises();
    expect(composer.displayedItems.value[0]).toMatchObject({ isUploading: true, progress: 42 });
    finish(uploaded('a.mp4'));
    await pending;
    expect(composer.displayedItems.value).toMatchObject([{ isUploading: false }]);
  });

  it('cancel aborts the request, removes the item and shows no message (AC-007)', async () => {
    const target = newTarget();
    const composer = mountComposer(target);
    const signals = new Map<string, AbortSignal>();
    uploadStoreMock.uploadAttachment.mockImplementation(({ file, signal: given }: { file: File; signal: AbortSignal }) => {
      signals.set(file.name, given);
      return new Promise((_, reject) => given.addEventListener('abort', () => reject(new Error('canceled'))));
    });
    const pending = composer.uploadFiles([fileOf('a.mp4', 'video/mp4'), fileOf('b.mp4', 'video/mp4')]);
    await flushPromises();
    const [first, second] = composer.displayedItems.value;

    composer.cancelUpload(first!.key);
    await flushPromises();

    expect(signals.get('a.mp4')!.aborted).toBe(true);
    expect(signals.get('b.mp4')!.aborted).toBe(false);
    expect(composer.displayedItems.value.map((item) => item.key)).toEqual([second!.key]);
    expect(composer.attachmentErrorLines.value).toEqual([]);
    composer.cancelUpload(second!.key);
    await pending;
    expect(composer.displayedItems.value).toEqual([]);
    expect(composer.attachmentErrorLines.value).toEqual([]);
    expect(target.attachments).toEqual([]);
  });

  it('reports a failed removal by name only', async () => {
    const attachment = hydrateContextAttachment({ locator: '/rest/drafts/agent-runs/temp-agent-1/context-files/ctx_a1__notes.txt' });
    const target = reactive({ key: 'target-1', subject: null, attachments: [attachment] as ContextAttachment[], draftOwner });
    const composer = mountComposer(target);
    uploadStoreMock.deleteDraftAttachment.mockRejectedValue(new Error('Server says: forbidden'));
    await composer.removeItem(composer.displayedItems.value[0]!);
    expect(composer.attachmentErrorLines.value).toEqual([{ kind: 'remove_failed', fileNames: ['notes.txt'] }]);
  });
});
