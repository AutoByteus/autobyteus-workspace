<template>
  <main class="min-h-screen bg-slate-100 p-6" data-test="team-task-conversation-probe">
    <section class="mx-auto h-[760px] max-w-[1180px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <TeamOverviewPanel />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import type {
  TaskDelegationRecordDto,
  TeamCommunicationMessageDto,
  TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import TeamOverviewPanel from '~/components/workspace/team/TeamOverviewPanel.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const ROOT_TEAM_RUN_ID = 'browser-team-run';
const TEACHER_RUN_ID = 'teacher-run';
const OBSERVER_RUN_ID = 'observer-run';
const ACCEPTED_TASK_ID = 'task-accepted-lifecycle';
const INTERRUPTED_TASK_ID = 'task-interrupted-lifecycle';
const UNRELATED_TASK_ID = 'task-observer-only';
const { setPreference } = useLocalization();

const reference = (referenceId: string, path: string) => ({
  reference_id: referenceId,
  path,
  type: 'file' as const,
  created_at: '2026-08-20T10:00:00.000Z',
  updated_at: '2026-08-20T10:00:00.000Z',
});

const firstSubmission = {
  kind: 'submission' as const,
  submission_id: 'submission-1',
  message: '# Initial result\n\nThe first classroom result needs review.',
  reference_files: [reference('result-v1-ref', '/workspace/result-v1.md')],
  created_at: '2026-08-20T10:28:00.000Z',
};
const revisionRequest = {
  kind: 'review' as const,
  review_id: 'review-1',
  reviewed_submission_id: firstSubmission.submission_id,
  decision: 'request_revision' as const,
  comment: 'Please add the missing verification note.',
  reference_files: [reference('review-ref', '/workspace/review.md')],
  created_at: '2026-08-20T10:42:00.000Z',
};
const revisedSubmission = {
  kind: 'submission' as const,
  submission_id: 'submission-2',
  message: '# Revised result\n\nThe verification note is now included.',
  reference_files: [reference('result-v2-ref', '/workspace/result-v2.md')],
  created_at: '2026-08-20T11:06:00.000Z',
};
const acceptance = {
  kind: 'review' as const,
  review_id: 'review-2',
  reviewed_submission_id: revisedSubmission.submission_id,
  decision: 'accept' as const,
  comment: null,
  reference_files: [],
  created_at: '2026-08-20T11:18:00.000Z',
};

const revisionRequestedTask = testTaskRecord({
  taskId: ACCEPTED_TASK_ID,
  delegatorAgentRunId: TEACHER_RUN_ID,
  recipientAddress: '/StudentStudyGroup',
  target: { teamRunId: 'task-study-group-run' },
  status: 'active',
  description: '# Classroom assignment\n\nReturn a verified nested-team result.',
  referenceFiles: [reference('assignment-ref', '/workspace/assignment.md')],
  createdAt: '2026-08-20T10:10:00.000Z',
  updates: [firstSubmission, revisionRequest],
});
const acceptedTask: TaskDelegationRecordDto = {
  ...revisionRequestedTask,
  status: 'accepted',
  updates: [firstSubmission, revisionRequest, revisedSubmission, acceptance],
};
const interruptedTask = testTaskRecord({
  taskId: INTERRUPTED_TASK_ID,
  delegatorAgentRunId: TEACHER_RUN_ID,
  recipientAddress: '/StudentStudyGroup',
  target: { teamRunId: 'task-interrupted-team-run' },
  status: 'interrupted',
  description: 'Wait for interruption validation.',
  createdAt: '2026-08-20T12:00:00.000Z',
  updates: [{
    kind: 'interruption', interruption_id: 'interruption-1',
    reason: 'Root TeamRun terminated during the interruption scenario.',
    created_at: '2026-08-20T12:05:00.000Z',
  }],
});
const observerTask = testTaskRecord({
  taskId: UNRELATED_TASK_ID,
  delegatorAgentRunId: OBSERVER_RUN_ID,
  recipientAddress: '/Teacher',
  target: { agentRunId: 'observer-target-task-run' },
  status: 'awaiting_review',
  description: 'Observer-only unrelated task.',
  createdAt: '2026-08-20T09:00:00.000Z',
  updates: [{
    kind: 'submission', submission_id: 'observer-submission-1',
    message: 'Observer result.', reference_files: [],
    created_at: '2026-08-20T09:10:00.000Z',
  }],
});
const ordinaryMessage: TeamCommunicationMessageDto = {
  message_id: 'ordinary-message-1',
  sender_agent_run_id: TEACHER_RUN_ID,
  receiver_agent_run_id: OBSERVER_RUN_ID,
  content: 'Ordinary classroom note; this must remain in Messages only.',
  message_type: 'note',
  created_at: '2026-08-20T08:30:00.000Z',
  reference_files: [],
};

const studentOne = testAgentNode('/StudentStudyGroup/student_one', { agentRunId: 'student-one-persistent-run' });
const studentTwo = testAgentNode('/StudentStudyGroup/student_two', { agentRunId: 'student-two-persistent-run' });
const studyGroup = testSubTeamNode('/StudentStudyGroup', [studentOne, studentTwo], {
  teamRunId: 'study-group-persistent-run',
  coordinatorAddress: studentOne.address,
});
const rootChildren = [
  testAgentNode('/Teacher', { agentRunId: TEACHER_RUN_ID }),
  studyGroup,
  testAgentNode('/Observer', { agentRunId: OBSERVER_RUN_ID }),
];
const initialContext = buildTestTeamContext({
  teamRunId: ROOT_TEAM_RUN_ID,
  teamDefinitionName: 'Nested Classroom Probe',
  coordinatorAddress: '/Teacher',
  focusedAgentRunId: TEACHER_RUN_ID,
  rootChildren,
  messages: [ordinaryMessage],
  tasks: [],
  baseChangeSequence: 0,
});
const restoredContext = buildTestTeamContext({
  teamRunId: ROOT_TEAM_RUN_ID,
  teamDefinitionName: 'Nested Classroom Probe',
  coordinatorAddress: '/Teacher',
  focusedAgentRunId: TEACHER_RUN_ID,
  rootChildren,
  messages: [ordinaryMessage],
  tasks: [revisionRequestedTask, interruptedTask, observerTask],
  baseChangeSequence: 40,
});

const teamStore = useAgentTeamContextsStore();
const selectionStore = useAgentSelectionStore();
teamStore.addTeamContext(initialContext);
selectionStore.setRunSelection(ROOT_TEAM_RUN_ID, 'team');

const snapshot = (): Extract<TeamStreamServerMessage, { type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' }> => ({
  type: 'TEAM_EXECUTION_VIEW_SNAPSHOT',
  payload: {
    root_team_run_id: ROOT_TEAM_RUN_ID,
    base_change_sequence: 40,
    execution_tree: restoredContext.view.getExecutionTree(),
    tasks: [revisionRequestedTask, interruptedTask, observerTask],
    messages: [ordinaryMessage],
    agent_statuses: restoredContext.view.listAgentContextEntries().map((entry) => ({
      agent_run_id: entry.agentRunId,
      member_address: entry.memberAddress,
      status: 'idle',
      trigger: null,
      tool_name: null,
      error_message: null,
      error_details: null,
    })),
  },
});

const studentTaskRunId = restoredContext.view.listAgentContextEntries()
  .find((entry) => entry.memberAddress === '/StudentStudyGroup/student_one'
    && entry.agentRunId.startsWith('task-study-group-run:'))?.agentRunId;
if (!studentTaskRunId) throw new Error('Probe fixture could not resolve the task-Team coordinator AgentRun.');

type TeamTaskConversationProbeControl = {
  acceptLive: () => string;
  focus: (agentRunId: string) => string;
  hydrate: () => string;
  ids: Readonly<{
    acceptedTaskId: string;
    interruptedTaskId: string;
    observerRunId: string;
    studentTaskRunId: string;
    teacherRunId: string;
  }>;
  setLocale: (locale: 'en' | 'zh-CN') => Promise<void>;
};

onMounted(() => {
  const globalWindow = window as typeof window & { __teamTaskConversationProbe?: TeamTaskConversationProbeControl };
  globalWindow.__teamTaskConversationProbe = {
    hydrate: () => initialContext.view.applySnapshot(snapshot()).disposition,
    acceptLive: () => initialContext.view.applyMessage({
      type: 'TASK_DELEGATION_EVENT',
      payload: { event_type: 'TASK_CHANGED', change_sequence: 41, task: acceptedTask },
    }).disposition,
    focus: (agentRunId) => initialContext.view.focusAgent(agentRunId).disposition,
    setLocale: async (locale) => { await setPreference(locale); },
    ids: Object.freeze({
      acceptedTaskId: ACCEPTED_TASK_ID,
      interruptedTaskId: INTERRUPTED_TASK_ID,
      observerRunId: OBSERVER_RUN_ID,
      studentTaskRunId,
      teacherRunId: TEACHER_RUN_ID,
    }),
  };
});

onBeforeUnmount(() => {
  const globalWindow = window as typeof window & { __teamTaskConversationProbe?: TeamTaskConversationProbeControl };
  delete globalWindow.__teamTaskConversationProbe;
});
</script>
