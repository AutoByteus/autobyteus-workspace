<template>
  <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white" data-test="chat-run-view">
    <ChatRunHeader :context="context" />
    <WorkspaceToolShell scope="chat" data-test="chat-tool-shell">
      <div class="relative min-h-0 flex-1 overflow-hidden bg-white">
        <div class="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-col">
          <AgentEventMonitor
            :conversation="context.state.conversation"
            :run-id="context.state.runId"
            :agent-name="agentName"
            :agent-avatar-url="avatarUrl || null"
            :presentation-revision="context.state.eventMonitorPresentationRevision"
            :has-earlier-active-trace-events="context.state.hasEarlierActiveTraceEvents"
            :browse-subject="browseSubject"
            class="h-full"
          >
            <template v-if="skillImprovementTarget" #composerContext>
              <SkillImprovementComposerCta :target="skillImprovementTarget" />
            </template>
            <template #composer>
              <ChatComposer
                :target="target"
                :placeholder="placeholder"
                :skill-options="options.skillOptions.value"
                :skills-all-installed="options.skillsAllInstalled.value"
              >
                <template #footer-right>
                  <ChatModelMenu
                    :runtime-kind="controls.runtimeKind.value"
                    :llm-model-identifier="controls.llmModelIdentifier.value"
                    :model-label="controls.modelLabel.value"
                    :fixed="controls.mode.value === 'persisted' ? controls.fixedModels.value : null"
                    :locked-reason="controls.lockedReason.value"
                    @select="controls.selectModel"
                    @retry-fixed="existingRunConfigStore.refreshModelOptions()"
                  />
                  <ChatThinkingControl
                    :schema="controls.thinkingSchema.value"
                    :llm-config="controls.llmConfig.value"
                    :locked-reason="controls.lockedReason.value"
                    @update="controls.selectThinking"
                  />
                </template>
              </ChatComposer>
            </template>
          </AgentEventMonitor>
        </div>
        <WorkspaceCenterLoadingOverlay v-if="runHistoryStore.openingRun" />
      </div>
    </WorkspaceToolShell>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue'
import WorkspaceToolShell from '~/components/layout/WorkspaceToolShell.vue'
import WorkspaceCenterLoadingOverlay from '~/components/layout/WorkspaceCenterLoadingOverlay.vue'
import SkillImprovementComposerCta from '~/components/workspace/skill-improvement/SkillImprovementComposerCta.vue'
import type { SkillImprovementComposerCtaTarget } from '~/components/workspace/skill-improvement/skillImprovementComposerCtaTarget'
import ChatRunHeader from '~/components/chat/ChatRunHeader.vue'
import ChatComposer from '~/components/chat/ChatComposer.vue'
import ChatModelMenu from '~/components/chat/ChatModelMenu.vue'
import ChatThinkingControl from '~/components/chat/ChatThinkingControl.vue'
import { useChatRunModelControls } from '~/components/chat/chatRunModelControls'
import { useComposerTarget } from '~/composables/agentInput/useComposerTarget'
import { useChatComposerOptions } from '~/composables/chat/useChatComposerOptions'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import type { AgentContext } from '~/types/agent/AgentContext'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID } from '~/utils/chat/chatDefaults'
import { useLocalization } from '~/composables/useLocalization'

/**
 * A single-agent run in the chat view (UIS-008): header facts, the conversation in a centered
 * column, the Chat box bound to the active composer target, and the product's right tool strip.
 */
const props = defineProps<{ context: AgentContext }>()

const { t } = useLocalization()
const definitions = useAgentDefinitionStore()
const runHistoryStore = useRunHistoryStore()
const existingRunConfigStore = useExistingRunConfigStore()
const activeTarget = useComposerTarget()
// The displayed context is the selected standalone run; bind only to that exact context.
const target = computed(() => (activeTarget.value?.context === props.context ? activeTarget.value : null))
const contextRef = toRef(props, 'context')
const controls = useChatRunModelControls(contextRef)
const options = useChatComposerOptions(computed(() => props.context.config.agentDefinitionId))

const agentName = computed(() => props.context.config.agentDefinitionName
  || definitions.getAgentDefinitionById(props.context.config.agentDefinitionId)?.name
  || '')
const avatarUrl = computed(() => props.context.config.agentAvatarUrl?.trim()
  || definitions.getAgentDefinitionById(props.context.config.agentDefinitionId)?.avatarUrl?.trim()
  || '')
const browseSubject = computed(() => ({ kind: 'run' as const, runId: props.context.state.runId }))
const placeholder = computed(() => (props.context.config.agentDefinitionId === DEFAULT_CHAT_AGENT_DEFINITION_ID
  ? t('chat.run.placeholderDefault')
  : t('chat.run.placeholderAgent', { agent: agentName.value })))

const skillImprovementTarget = computed<SkillImprovementComposerCtaTarget>(() => ({
  kind: 'agent',
  runId: props.context.state.runId,
  isHelperRun: props.context.config.agentDefinitionId === 'autobyteus-retrospective-skill-improver'
    || props.context.config.agentDefinitionName === 'Retrospective Skill Improver',
}))
</script>
