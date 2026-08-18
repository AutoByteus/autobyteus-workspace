<template>
  <main data-test="team-composer-browser-probe" class="p-6">
    <h1>AgentTeam composer browser probe</h1>
    <div class="controls">
      <button data-test="focus-a" type="button" @click="focusA">Focus A</button>
      <button data-test="focus-b" type="button" @click="focusB">Focus B</button>
      <button data-test="stage-success-attachments" type="button" @click="stageSuccessfulRemovalAttachments">Stage success attachments</button>
      <button data-test="stage-failure-attachments" type="button" @click="stageFailureAttachments">Stage failure attachments</button>
      <button data-test="reset-a-attachments" type="button" @click="resetAAttachments">Reset A attachments</button>
      <button data-test="stage-send-attachments" type="button" @click="stageSendAttachments">Stage send attachments</button>
      <button data-test="prepare-a-voice" type="button" @click="prepareAVoice">Prepare captured A voice</button>
      <button data-test="complete-voice" type="button" @click="completeVoice">Complete voice result</button>
      <button data-test="select-standalone" type="button" @click="selectStandalone">Select standalone</button>
      <button data-test="prepare-standalone-voice" type="button" @click="prepareStandaloneVoice">Prepare standalone voice</button>
      <button data-test="clear-standalone" type="button" @click="clearStandalone">Clear standalone</button>
    </div>

    <section data-test="composer-surface">
      <p data-test="selection">{{ selectionLabel }}</p>
      <p data-test="visible-draft">{{ activeContextStore.currentRequirement }}</p>
      <p data-test="visible-pending">{{ String(activeContextStore.submissionPending) }}</p>
      <p data-test="visible-attachment-ids">{{ activeContextStore.currentContextPaths.map((item) => item.id).join(',') }}</p>
      <ContextFilePathInputArea />
      <AgentUserInputTextArea />
    </section>

    <section data-test="authoritative-state">
      <p data-test="a-draft">{{ memberA.requirement }}</p>
      <p data-test="a-pending">{{ String(memberA.submissionPending) }}</p>
      <p data-test="a-attachment-ids">{{ memberA.contextFilePaths.map((item) => item.id).join(',') }}</p>
      <p data-test="a-event-count">{{ memberA.state.conversation.messages.length }}</p>
      <p data-test="a-event-attachment-ids">{{ aEventAttachmentIds }}</p>
      <p data-test="b-draft">{{ memberB.requirement }}</p>
      <p data-test="b-pending">{{ String(memberB.submissionPending) }}</p>
      <p data-test="b-attachment-ids">{{ memberB.contextFilePaths.map((item) => item.id).join(',') }}</p>
      <p data-test="standalone-draft">{{ standalone.requirement }}</p>
      <p data-test="send-count">{{ sendCalls.length }}</p>
      <p data-test="send-last">{{ JSON.stringify(sendCalls.at(-1) ?? null) }}</p>
      <p data-test="delete-calls">{{ deletedIds.join(',') }}</p>
      <p data-test="voice-outcome">{{ voiceInputStore.latestResult?.outcome ?? 'none' }}</p>
      <p data-test="voice-error">{{ voiceFailure }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useVoiceInputStore } from '~/stores/voiceInputStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ContextAttachment } from '~/types/conversation';
import { buildTestTeamContext, testAgentContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { createUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

definePageMeta({ layout: false });

const rootTeamRunId = 'browser-team-run';
const memberARunId = 'browser-member-a-run';
const memberBRunId = 'browser-member-b-run';
const standaloneRunId = 'browser-standalone-run';

const selectionStore = useAgentSelectionStore();
const teamContextsStore = useAgentTeamContextsStore();
const agentContextsStore = useAgentContextsStore();
const activeContextStore = useActiveContextStore();
const teamRunStore = useAgentTeamRunStore();
const uploadStore = useContextFileUploadStore();
const runHistoryStore = useRunHistoryStore();
const voiceInputStore = useVoiceInputStore();

const team = buildTestTeamContext({
  teamRunId: rootTeamRunId,
  coordinatorAddress: '/member_a',
  focusedAgentRunId: memberARunId,
  rootChildren: [
    testAgentNode('/member_a', { agentRunId: memberARunId, displayName: 'Member A', currentStatus: AgentStatus.Idle }),
    testAgentNode('/member_b', { agentRunId: memberBRunId, displayName: 'Member B', currentStatus: AgentStatus.Idle }),
  ],
});
teamContextsStore.teams = new Map([[rootTeamRunId, team]]);
selectionStore.selectRunWithoutShellNavigation(rootTeamRunId, 'team');

const memberA = team.view.getAgentContext(memberARunId)!;
const memberB = team.view.getAgentContext(memberBRunId)!;
const standaloneRaw = testAgentContext({ runId: standaloneRunId, displayName: 'Standalone', status: AgentStatus.Idle });
agentContextsStore.runs.set(standaloneRunId, standaloneRaw);
const standalone = agentContextsStore.runs.get(standaloneRunId)!;

type SendCall = {
  text: string;
  agentRunId: string;
  contextFilePaths: string[];
  imageUrls: string[];
  options: { messageId: string; dedupeKey: string };
};
const sendCalls = ref<SendCall[]>([]);
const deletedIds = ref<string[]>([]);
const voiceFailure = ref('');

const fakeService = {
  sendMessage: (
    text: string,
    agentRunId: string,
    contextFilePaths: string[],
    imageUrls: string[],
    options: { messageId: string; dedupeKey: string },
  ) => sendCalls.value.push({ text, agentRunId, contextFilePaths, imageUrls, options }),
};

teamRunStore.ensureTeamStreamConnected = async () => fakeService as any;
uploadStore.finalizeDraftAttachments = async ({ attachments }) => attachments;
uploadStore.deleteDraftAttachment = async ({ attachment }) => {
  deletedIds.value.push(attachment.id);
  if (attachment.id === 'failure-keep') {
    throw new Error('synthetic draft delete failure');
  }
};
runHistoryStore.markTeamAsActive = () => undefined;
runHistoryStore.refreshTreeQuietly = async () => undefined;
voiceInputStore.initialized = true;

const selectionLabel = computed(() => {
  if (selectionStore.selectedType === 'agent') return 'standalone';
  return team.view.getFocusedAgentRunId() === memberARunId ? 'member-a' : 'member-b';
});

const aEventAttachmentIds = computed(() => {
  const message = memberA.state.conversation.messages.at(-1);
  return message?.contextFilePaths?.map((item) => item.id).join(',') ?? '';
});

const draftAttachment = (id: string, displayName: string) => createUploadedContextAttachment({
  storedFilename: id,
  locator: `/rest/drafts/team-runs/${rootTeamRunId}/members/member_a/context-files/${id}`,
  displayName,
  phase: 'draft',
  type: displayName.endsWith('.png') ? 'Image' : 'Text',
});

const workspaceAttachment = (id: string, locator: string, type: 'Image' | 'Text'): ContextAttachment => ({
  kind: 'workspace_path', id, locator, displayName: locator.split('/').at(-1) ?? id, type,
});

const focusA = () => {
  selectionStore.selectRunWithoutShellNavigation(rootTeamRunId, 'team');
  teamContextsStore.focusMember(rootTeamRunId, memberARunId);
};
const focusB = () => {
  selectionStore.selectRunWithoutShellNavigation(rootTeamRunId, 'team');
  teamContextsStore.focusMember(rootTeamRunId, memberBRunId);
};

const stageSuccessfulRemovalAttachments = () => {
  focusA();
  memberA.contextFilePaths = [
    draftAttachment('success-one', 'success-one.txt'),
    draftAttachment('success-two', 'success-two.txt'),
  ];
};

const stageFailureAttachments = () => {
  focusA();
  memberA.contextFilePaths = [
    draftAttachment('failure-keep', 'failure-keep.txt'),
    draftAttachment('failure-remove', 'failure-remove.txt'),
  ];
};

const resetAAttachments = () => {
  memberA.contextFilePaths = [];
};

const stageSendAttachments = () => {
  focusA();
  memberA.contextFilePaths = [
    workspaceAttachment('retained-image', '/synthetic/retained-image.png', 'Image'),
    workspaceAttachment('retained-file', '/synthetic/retained-file.txt', 'Text'),
    workspaceAttachment('removed-file', '/synthetic/removed-file.txt', 'Text'),
  ];
};

const installVoiceResultBoundary = (target: typeof memberA, transcript: string) => {
  const electronAPI = {
    transcribeVoiceInput: async () => ({
      ok: true,
      text: transcript,
      detectedLanguage: 'en',
      noSpeech: false,
      error: null,
    }),
  };
  Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: electronAPI });
  voiceInputStore.isRecording = true;
  voiceInputStore.recordingSource = 'composer';
  voiceInputStore.composerTargetContext = target;
  voiceInputStore.stream = { getTracks: () => [{ stop: () => undefined }] } as any;
  voiceInputStore.audioContext = { close: async () => undefined } as any;
  voiceInputStore.audioWorklet = {
    port: {
      postMessage: () => queueMicrotask(() => voiceInputStore.flushPromiseResolve?.({
        audioData: new Uint8Array([1, 2, 3]).buffer,
        diagnostics: {
          inputSampleRate: 48000,
          wavSampleRate: 48000,
          durationMs: 1200,
          rms: 0.025,
          peak: 0.3,
          sampleCount: 57600,
        },
      })),
    },
  } as any;
};

const prepareAVoice = () => {
  voiceFailure.value = '';
  memberA.requirement = 'Voice base';
  focusB();
  installVoiceResultBoundary(memberA, 'captured transcript');
};

const completeVoice = async () => {
  try {
    await voiceInputStore.stopRecording();
  } catch (error) {
    voiceFailure.value = error instanceof Error ? error.message : String(error);
  }
};

const selectStandalone = () => {
  selectionStore.selectRunWithoutShellNavigation(standaloneRunId, 'agent');
};

const prepareStandaloneVoice = () => {
  voiceFailure.value = '';
  installVoiceResultBoundary(standalone, 'standalone transcript');
};

const clearStandalone = async () => {
  standalone.requirement = '';
  await nextTick();
};
</script>

<style scoped>
.controls { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
section { margin-top: 1rem; border: 1px solid #cbd5e1; padding: 1rem; }
button { border: 1px solid #64748b; padding: 0.3rem 0.6rem; }
</style>
