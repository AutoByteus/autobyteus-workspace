<template>
  <main class="min-h-screen bg-gray-50 p-8" data-test="mention-probe">
    <nav class="mb-32 flex flex-wrap gap-3 text-sm">
      <button v-for="kind in kinds" :key="kind" :data-test="'scope-' + kind" @click="current = kind">{{ kind }}</button>
      <button data-test="english" @click="locale('en')">English</button>
      <button data-test="chinese" @click="locale('zh-CN')">中文</button>
      <button data-test="resize" @click="narrow = !narrow">Resize panel</button>
      <button data-test="reject" @click="reject = !reject">Reject: {{ reject }}</button>
    </nav>
    <div :style="{ width: narrow ? '300px' : 'min(704px, calc(100vw - 404px))' }" data-test="probe-composer">
      <AgentUserInputForm v-if="current === 'agent'" :skill-tagging="skills" />
      <div v-else class="relative rounded-xl border border-gray-200 bg-white shadow-sm">
      <ContextFilePathInputArea :target="target" />
      <div class="border-t border-gray-100">
        <SkillTagChips v-if="ctx.requestedSkillNames.length" :names="ctx.requestedSkillNames" @remove="ctx.requestedSkillNames = ctx.requestedSkillNames.filter(n => n !== $event)" />
        <AgentUserInputTextArea :target="target" :skill-tagging="current === 'agent' ? skills : null" placeholder="Unchanged no-scope copy" />
      </div>
      </div>
    </div>
    <output data-test="probe-state" class="block mt-4 text-xs">{{ JSON.stringify(snapshot()) }}</output>
  </main>
</template>
<script setup lang="ts">
// Handwritten synthetic contexts. No source-state capture, provider, production persistence or send bypass claim.
import { computed, reactive, ref, watch } from 'vue';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue';
import SkillTagChips from '~/components/chat/SkillTagChips.vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { resolveRunMentionScope } from '~/composables/agentInput/runMentionScope';
import { useLocalization } from '~/composables/useLocalization';
import { mentionsPresentInText, toCollaboratorMentionDtos } from '~/utils/collaborators/collaboratorMentionText';
import { beginLocalUserSubmission, acceptLocalSubmission, failLocalSubmission } from '~/services/runSubmission/localUserSubmission';
import { CollaboratorAddRejection } from '~/services/collaborators/collaboratorAddFailures';
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget';
definePageMeta({ layout: false });
const kinds = ['agent', 'team', 'org', 'org-team', 'agent-task', 'agent-team-task', 'org-task', 'org-team-task', 'launch', 'read-only'] as const;
const current = ref<typeof kinds[number]>('agent');
const narrow = ref(false), reject = ref(true);
const { setPreference: locale } = useLocalization();
const contexts = Object.fromEntries(kinds.map(kind => {
  const id = kind === 'launch' ? 'temp-probe' : 'probe-' + kind;
  const config = { agentDefinitionId: 'researcher', agentDefinitionName: 'Research Assistant', llmModelIdentifier: 'test-model', runtimeKind: 'codex_app_server', workspaceId: null, workspaceMetadata: null, autoExecuteTools: false, llmConfig: null, isLocked: true };
  const context = reactive(new AgentContext(config as never, new AgentRunState(id, { id, messages: [], createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', agentDefinitionId: 'researcher', agentName: 'Research Assistant', llmModelIdentifier: 'test-model' })));
  context.state.currentStatus = AgentStatus.Idle;
  return [kind, context];
}));
const ctx = computed(() => contexts[current.value]);
const workspaceTarget = computed(() => {
  const base = { context: ctx.value, access: current.value === 'read-only' ? 'read_only' : 'live', address: '/researcher', agentRunId: ctx.value.state.runId };
  if (current.value === 'team') return { ...base, kind: 'standalone_team_member', team: { rootRunId: 'probe-team-root', focusedMemberAddress: '/researcher' } };
  const mapping = { org: 'agent_org_direct_agent', 'org-team': 'agent_org_team_member', 'agent-task': 'agent_run_task_agent', 'agent-team-task': 'agent_run_task_team_member', 'org-task': 'agent_org_task_agent', 'org-team-task': 'agent_org_task_team_member' };
  if (current.value in mapping) return { ...base, kind: mapping[current.value], host: { hostRunId: 'probe-agent-root' }, root: { orgRunId: 'probe-org-root' } };
  return { ...base, kind: 'standalone_agent' };
});
const sends = reactive<Array<Record<string, unknown>>>([]);
const target = computed<ComposerTarget>(() => ({
  key: ctx.value.state.runId, context: ctx.value as AgentContext, draftOwner: { kind: 'agent_draft', draftRunId: ctx.value.state.runId }, access: current.value === 'read-only' ? 'read_only' : 'live',
  mentionScope: resolveRunMentionScope(workspaceTarget.value as never),
  async send() {
    const context = ctx.value as AgentContext;
    const active = mentionsPresentInText(context.requirement, context.requestedMentions);
    sends.push({ focusedRunId: context.state.runId, mentions: toCollaboratorMentionDtos(context.requirement, context.requestedMentions), text: context.requirement, attachments: [...context.contextFilePaths], rejected: reject.value });
    const submission = beginLocalUserSubmission(context, { text: context.requirement, attachments: context.contextFilePaths, mentions: active, navigationTarget: null });
    // A transport outcome double. Production submission owner, not a custom draft clear/retain implementation.
    if (reject.value) failLocalSubmission(submission, new CollaboratorAddRejection('Product Team', 'Test admission rejected'));
    else acceptLocalSubmission(submission);
    context.submissionPending = false;
  },
}));
// Seed the normal standalone selection path; emulate only the run-store transport action.
const agentStore = useAgentContextsStore();
const selectionStore = useAgentSelectionStore();
agentStore.runs.set('probe-agent', contexts.agent as AgentContext);
useAgentRunStore().sendUserInputAndSubscribe = async () => { await target.value.send(); };
watch(current, (kind) => { if (kind === 'agent') selectionStore.selectRunWithoutShellNavigation('probe-agent', 'agent'); }, { immediate: true });
const skills = { skills: [{ name: 'review', description: 'Review a draft' }], allInstalled: true, placeholder: 'Use / skills' };
const snapshot = () => ({ kind: current.value, scope: target.value.mentionScope, text: ctx.value.requirement, chosen: ctx.value.requestedMentions, active: toCollaboratorMentionDtos(ctx.value.requirement, ctx.value.requestedMentions), attachments: ctx.value.contextFilePaths, skills: ctx.value.requestedSkillNames, messages: ctx.value.state.conversation.messages, failure: ctx.value.collaboratorAddFailure, sends });
</script>
