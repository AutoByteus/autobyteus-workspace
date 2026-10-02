<template>
  <main class="min-h-screen bg-gray-50 p-8">
    <div class="mb-6 flex gap-4 text-sm"><button @click="locale('en')">English</button><button @click="locale('zh-CN')">中文</button><button @click="switchContext">Switch context</button><button @click="narrow = !narrow">Resize panel</button><button @click="attachment">Completed attachment</button></div>
    <div ref="composer" :style="{ width: narrow ? '300px' : 'min(704px, 100%)' }" class="rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300" data-test="self-composer">
      <ContextFilePathInputArea :target="target" />
      <div class="border-t border-gray-100"><AgentUserInputTextArea :target="target" /></div>
    </div>
    <pre class="mt-4 text-xs" data-test="draft-state">{{ JSON.stringify({text:ctx.requirement, chosen:ctx.requestedMentions, active:dtos, attachments:ctx.contextFilePaths}) }}</pre>
  </main>
</template>
<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue';
import { useLocalization } from '~/composables/useLocalization';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { toCollaboratorMentionDtos } from '~/utils/collaborators/collaboratorMentionText';
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget';
definePageMeta({ layout: false });
const makeContext = (id: string) => reactive({requirement:'', requestedMentions:[], requestedSkillNames:[], contextFilePaths:[], submissionPending:false, collaboratorAddFailure:null, config:{agentDefinitionName:'Research Assistant'}, state:{runId:id,currentStatus:AgentStatus.Idle}});
const contexts = [makeContext('self-a'), makeContext('self-b')];
const index = ref(0);
const ctx = computed(() => contexts[index.value]);
const narrow = ref(false);
const { setPreference:locale } = useLocalization();
const dtos = computed(() => toCollaboratorMentionDtos(ctx.value.requirement,ctx.value.requestedMentions));
const target = computed<ComposerTarget>(() => ({key:ctx.value.state.runId, context:ctx.value as never, draftOwner:null, access:'live', mentionScope:{rootKind:'agent_team',rootRunId:'self-root',focusedName:'researcher'}, send:async()=>undefined}));
const switchContext = () => { index.value = 1-index.value; };
const attachment = () => { ctx.value.contextFilePaths = [{kind:'uploaded',id:'completed',locator:'/test-owned/completed.txt',storedFilename:'completed.txt',displayName:'completed.txt',phase:'draft',type:'Text'}] as never; };
onMounted(() => { void locale('en'); });
</script>
