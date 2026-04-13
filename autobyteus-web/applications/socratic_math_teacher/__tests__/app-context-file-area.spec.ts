import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, nextTick, reactive, ref } from 'vue';
import AppContextFileArea from '../components/AppContextFileArea.vue';
import type { ContextAttachment } from '~/types/conversation';
import {
  createUploadedContextAttachment,
  createWorkspaceContextAttachment,
} from '~/utils/contextFiles/contextAttachmentModel';

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
};

const contextFileUploadStoreMock = reactive({
  uploadAttachment: vi.fn(),
  deleteDraftAttachment: vi.fn(),
});

const fileExplorerStoreMock = reactive({
  openFile: vi.fn(),
});

const windowNodeContextStoreMock = reactive({
  isEmbeddedWindow: true,
});

const workspaceStoreMock = reactive({
  activeWorkspace: { workspaceId: 'ws-1' },
});

vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => contextFileUploadStoreMock,
}));

vi.mock('~/stores/fileExplorer', () => ({
  useFileExplorerStore: () => fileExplorerStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

describe('AppContextFileArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).electronAPI = {
      getPathForFile: vi.fn(),
    };
  });

  it('keeps a pending upload with the member that started it after focus changes', async () => {
    const focusedMember = ref<'professor' | 'critic'>('professor');
    const drafts = reactive({
      professor: {
        attachments: [] as ContextAttachment[],
        owner: {
          kind: 'team_member_draft' as const,
          draftTeamRunId: 'temp-app-team-1',
          memberRouteKey: 'professor',
        },
      },
      critic: {
        attachments: [] as ContextAttachment[],
        owner: {
          kind: 'team_member_draft' as const,
          draftTeamRunId: 'temp-app-team-1',
          memberRouteKey: 'critic',
        },
      },
    });

    let resolveUpload: ((attachment: ContextAttachment) => void) | null = null;
    contextFileUploadStoreMock.uploadAttachment.mockImplementation(
      () =>
        new Promise<ContextAttachment>((resolve) => {
          resolveUpload = resolve;
        }),
    );

    const Host = defineComponent({
      components: { AppContextFileArea },
      setup() {
        const currentDraft = computed(() => drafts[focusedMember.value]);
        const updateCurrentAttachments = (value: ContextAttachment[]) => {
          drafts[focusedMember.value].attachments = value;
        };
        const updateContextFilesForTarget = (
          targetBucketKey: string,
          updater: (current: ContextAttachment[]) => ContextAttachment[],
        ) => {
          drafts[targetBucketKey as 'professor' | 'critic'].attachments = updater([
            ...drafts[targetBucketKey as 'professor' | 'critic'].attachments,
          ]);
        };

        return {
          focusedMember,
          currentDraft,
          updateCurrentAttachments,
          updateContextFilesForTarget,
        };
      },
      template: `
        <AppContextFileArea
          :model-value="currentDraft.attachments"
          :draft-owner="currentDraft.owner"
          :context-files-target-key="focusedMember"
          :update-context-files-for-target="updateContextFilesForTarget"
          @update:model-value="updateCurrentAttachments"
        />
      `,
    });

    const wrapper = mount(Host);
    const input = wrapper.find('input[type="file"]');
    const file = new File(['proof-image'], 'proof.png', { type: 'image/png' });
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    });

    await input.trigger('change');
    await nextTick();

    expect(drafts.professor.attachments).toEqual([]);

    focusedMember.value = 'critic';
    await nextTick();

    resolveUpload?.(
      createUploadedContextAttachment({
        storedFilename: 'ctx_profproof__proof.png',
        locator: '/rest/drafts/team-runs/temp-app-team-1/members/professor/context-files/ctx_profproof__proof.png',
        displayName: 'proof.png',
        phase: 'draft',
        type: 'Image',
      }),
    );
    await flushPromises();

    expect(drafts.professor.attachments).toEqual([
      expect.objectContaining({
        kind: 'uploaded',
        displayName: 'proof.png',
        locator: '/rest/drafts/team-runs/temp-app-team-1/members/professor/context-files/ctx_profproof__proof.png',
      }),
    ]);
    expect(drafts.critic.attachments).toEqual([]);
    expect(contextFileUploadStoreMock.uploadAttachment).toHaveBeenCalledWith({
      owner: drafts.professor.owner,
      file,
    });
  });

  it('appends native workspace-path attachments for Electron file drops instead of uploading them', async () => {
    const attachments = ref<ContextAttachment[]>([]);
    const targetBucketKey = 'professor';
    const droppedFiles = [
      new File(['diagram'], 'diagram.png', { type: 'image/png' }),
      new File(['notes'], 'notes.txt', { type: 'text/plain' }),
    ];
    const resolvedNativePaths = ['/Users/normy/project/diagram.png', '/Users/normy/project/notes.txt'];
    const getPathForFileMock = vi.mocked((window as any).electronAPI.getPathForFile);
    getPathForFileMock
      .mockResolvedValueOnce(resolvedNativePaths[0])
      .mockResolvedValueOnce(resolvedNativePaths[1]);

    const wrapper = mount(AppContextFileArea, {
      props: {
        modelValue: attachments.value,
        draftOwner: {
          kind: 'team_member_draft',
          draftTeamRunId: 'temp-app-team-1',
          memberRouteKey: 'professor',
        },
        contextFilesTargetKey: targetBucketKey,
        updateContextFilesForTarget: (bucketKey: string, updater: (current: ContextAttachment[]) => ContextAttachment[]) => {
          expect(bucketKey).toBe(targetBucketKey);
          attachments.value = updater(attachments.value);
          void wrapper.setProps({ modelValue: attachments.value });
        },
        'onUpdate:modelValue': (value: ContextAttachment[]) => {
          attachments.value = value;
          void wrapper.setProps({ modelValue: value });
        },
      },
    });

    await wrapper.trigger('drop', {
      dataTransfer: {
        files: droppedFiles,
        getData: () => '',
      },
    });
    await flushPromises();

    expect(getPathForFileMock).toHaveBeenCalledTimes(2);
    expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
    expect(attachments.value).toEqual([
      createWorkspaceContextAttachment(resolvedNativePaths[0], 'Image'),
      createWorkspaceContextAttachment(resolvedNativePaths[1], 'Text'),
    ]);
  });

  it('keeps native Electron drops with the member that started them when focus changes before path resolution finishes', async () => {
    const focusedMember = ref<'professor' | 'critic'>('professor');
    const drafts = reactive({
      professor: {
        attachments: [] as ContextAttachment[],
        owner: {
          kind: 'team_member_draft' as const,
          draftTeamRunId: 'temp-app-team-1',
          memberRouteKey: 'professor',
        },
      },
      critic: {
        attachments: [] as ContextAttachment[],
        owner: {
          kind: 'team_member_draft' as const,
          draftTeamRunId: 'temp-app-team-1',
          memberRouteKey: 'critic',
        },
      },
    });
    const droppedFiles = [
      new File(['diagram'], 'diagram.png', { type: 'image/png' }),
      new File(['notes'], 'notes.txt', { type: 'text/plain' }),
    ];
    const firstPath = createDeferred<string>();
    const secondPath = createDeferred<string>();
    const getPathForFileMock = vi.mocked((window as any).electronAPI.getPathForFile);
    getPathForFileMock
      .mockImplementationOnce(() => firstPath.promise)
      .mockImplementationOnce(() => secondPath.promise);

    const Host = defineComponent({
      components: { AppContextFileArea },
      setup() {
        const currentDraft = computed(() => drafts[focusedMember.value]);
        const updateCurrentAttachments = (value: ContextAttachment[]) => {
          drafts[focusedMember.value].attachments = value;
        };
        const updateContextFilesForTarget = (
          targetBucketKey: string,
          updater: (current: ContextAttachment[]) => ContextAttachment[],
        ) => {
          drafts[targetBucketKey as 'professor' | 'critic'].attachments = updater([
            ...drafts[targetBucketKey as 'professor' | 'critic'].attachments,
          ]);
        };

        return {
          focusedMember,
          currentDraft,
          updateCurrentAttachments,
          updateContextFilesForTarget,
        };
      },
      template: `
        <AppContextFileArea
          :model-value="currentDraft.attachments"
          :draft-owner="currentDraft.owner"
          :context-files-target-key="focusedMember"
          :update-context-files-for-target="updateContextFilesForTarget"
          @update:model-value="updateCurrentAttachments"
        />
      `,
    });

    const wrapper = mount(Host);
    const dropPromise = wrapper.trigger('drop', {
      dataTransfer: {
        files: droppedFiles,
        getData: () => '',
      },
    });
    await nextTick();

    expect(getPathForFileMock).toHaveBeenCalledTimes(2);
    expect(drafts.professor.attachments).toEqual([]);
    expect(drafts.critic.attachments).toEqual([]);

    focusedMember.value = 'critic';
    await nextTick();

    firstPath.resolve('/Users/normy/project/diagram.png');
    secondPath.resolve('/Users/normy/project/notes.txt');
    await dropPromise;
    await flushPromises();

    expect(contextFileUploadStoreMock.uploadAttachment).not.toHaveBeenCalled();
    expect(drafts.professor.attachments).toEqual([
      createWorkspaceContextAttachment('/Users/normy/project/diagram.png', 'Image'),
      createWorkspaceContextAttachment('/Users/normy/project/notes.txt', 'Text'),
    ]);
    expect(drafts.critic.attachments).toEqual([]);
  });
});
