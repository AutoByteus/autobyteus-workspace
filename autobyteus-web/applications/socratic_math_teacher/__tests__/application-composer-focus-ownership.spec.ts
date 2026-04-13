import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import SocraticMathTeacherApp from '../index.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const applicationRunStoreMock = reactive({
  isLaunching: false,
  sendMessageToApplication: vi.fn(),
  terminateApplication: vi.fn(),
});

const runContextState = reactive({
  value: null as any,
});

const applicationContextStoreMock = reactive({
  getRun: vi.fn((applicationRunId: string) =>
    runContextState.value?.applicationRunId === applicationRunId ? runContextState.value : null,
  ),
});

vi.mock('~/stores/applicationRunStore', () => ({
  useApplicationRunStore: () => applicationRunStoreMock,
}));

vi.mock('~/stores/applicationContextStore', () => ({
  useApplicationContextStore: () => applicationContextStoreMock,
}));

const appChatInputStub = defineComponent({
  name: 'AppChatInput',
  props: {
    isLoading: { type: Boolean, required: true },
    draftOwner: { type: Object, default: null },
    contextFilesTargetKey: { type: String, default: null },
    updateContextFilesForTarget: { type: Function, required: false },
    problemText: { type: String, required: true },
    contextFiles: { type: Array, required: true },
  },
  emits: ['update:problemText', 'update:contextFiles', 'submit'],
  template: '<div data-test="app-chat-input" />',
});

describe('Socratic Math Teacher application composer ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applicationRunStoreMock.isLaunching = false;

    const teamContext = reactive({
      teamRunId: 'temp-app-team-1',
      focusedMemberName: 'professor',
      members: reactive(new Map([
        ['professor', { state: { currentStatus: AgentStatus.Idle } }],
        ['critic', { state: { currentStatus: AgentStatus.Idle } }],
      ])),
    });

    runContextState.value = reactive({
      applicationRunId: 'app-run-1',
      teamContext,
    });
  });

  it('keeps composer draft state aligned with the focused member instead of carrying uploaded drafts across focus changes', async () => {
    const wrapper = mount(SocraticMathTeacherApp, {
      props: {
        applicationRunId: 'app-run-1',
      },
      global: {
        stubs: {
          ChatDisplay: true,
          AppChatInput: appChatInputStub,
        },
      },
    });

    const chatInput = wrapper.findComponent(appChatInputStub);
    const professorDraftAttachment = createUploadedContextAttachment({
      storedFilename: 'ctx_prof__proof.png',
      locator: '/rest/drafts/team-runs/temp-app-team-1/members/professor/context-files/ctx_prof__proof.png',
      displayName: 'proof.png',
      phase: 'draft',
      type: 'Image',
    });

    chatInput.vm.$emit('update:problemText', 'Explain the proof');
    chatInput.vm.$emit('update:contextFiles', [professorDraftAttachment]);
    await nextTick();

    expect(chatInput.props('draftOwner')).toEqual({
      kind: 'team_member_draft',
      draftTeamRunId: 'temp-app-team-1',
      memberRouteKey: 'professor',
    });
    expect(chatInput.props('contextFilesTargetKey')).toBe('professor');
    expect(chatInput.props('problemText')).toBe('Explain the proof');
    expect(chatInput.props('contextFiles')).toEqual([professorDraftAttachment]);

    runContextState.value.teamContext.focusedMemberName = 'critic';
    await nextTick();

    expect(chatInput.props('draftOwner')).toEqual({
      kind: 'team_member_draft',
      draftTeamRunId: 'temp-app-team-1',
      memberRouteKey: 'critic',
    });
    expect(chatInput.props('contextFilesTargetKey')).toBe('critic');
    expect.soft(chatInput.props('problemText')).toBe('');
    expect.soft(chatInput.props('contextFiles')).toEqual([]);
  });
});
