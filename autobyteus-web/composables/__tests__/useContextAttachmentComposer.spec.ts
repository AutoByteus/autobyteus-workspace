import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import type { ContextAttachment } from '~/types/conversation';
import type { DraftContextFileOwnerDescriptor } from '~/utils/contextFiles/contextFileOwner';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import {
  useContextAttachmentComposer,
  type ContextAttachmentComposerTarget,
} from '../useContextAttachmentComposer';

const uploadStoreMock = vi.hoisted(() => ({
  isUploading: false,
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
  agent_collaboration_member_draft: {
    owner: { kind: 'agent_collaboration_member_draft', hostRunId: 'host-1', agentRunId: 'child-1' },
    locator: '/rest/drafts/agent-collaborations/host-1/agent-runs/child-1/context-files/ctx_c1__notes.txt',
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
      'agent_collaboration_member_draft', 'agent_draft', 'org_member_draft', 'team_member_draft',
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
