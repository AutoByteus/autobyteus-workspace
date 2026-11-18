<template>
  <section class="max-w-3xl" data-testid="model-routing-setup" :aria-label="t('settings.modelRouting.setup.title')">
    <h3 class="text-base font-semibold text-gray-900">{{ t('settings.modelRouting.setup.router.label') }}</h3>

    <!-- autobyteus-313 REQ-001: the app's launch controls, as on New chat and in run Settings; usable only while Model
         Routing is on and nothing is being saved. -->
    <div
      class="mt-3 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-md border border-gray-200 px-1.5 py-1"
      :class="controlsDisabled ? 'cursor-not-allowed bg-gray-50 opacity-60' : 'bg-white'"
      :inert="controlsDisabled || undefined"
      :aria-disabled="controlsDisabled ? 'true' : undefined"
      :aria-label="t('settings.modelRouting.setup.router.model')"
      role="group"
      data-testid="model-routing-router-row"
    >
      <ChatModelMenu
        placement="auto"
        align="left"
        :runtime-kind="controls.runtimeKind.value"
        :llm-model-identifier="controls.llmModelIdentifier.value"
        :model-label="controls.modelLabel.value"
        @select="controls.selectModel"
      />
      <ChatThinkingControl
        class="flex-shrink-0"
        placement="auto"
        align="left"
        :schema="controls.thinkingSchema.value"
        :llm-config="controls.llmConfig.value"
        @update="controls.selectModelConfig"
      />
      <ChatModelOptionControl
        v-for="option in modelOptions"
        :key="option.key"
        class="flex-shrink-0"
        placement="auto"
        align="left"
        :option="option"
        @update="controls.selectModelConfig(applyModelOption(controls.llmConfig.value, option.key, $event))"
      />
    </div>

    <div class="mt-6">
      <button
        type="button"
        class="inline-flex min-h-9 items-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        :disabled="!enabled || !status?.routerLaunch || saving"
        :title="enabled && status?.routerLaunch ? undefined : t('settings.modelRouting.setup.router.noConversation')"
        data-testid="model-routing-open-conversation"
        @click="emit('open-agent')"
      >{{ t('settings.modelRouting.setup.router.openConversation') }}</button>
      <p class="mt-2 text-sm text-gray-500">{{ t('settings.modelRouting.setup.router.teachHint') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import ChatModelMenu from '~/components/chat/ChatModelMenu.vue'
import ChatThinkingControl from '~/components/chat/ChatThinkingControl.vue'
import ChatModelOptionControl from '~/components/chat/ChatModelOptionControl.vue'
import type { ModelRouterLaunch, ModelRoutingStatus } from '~/types/modelRouting'
import { applyModelOption, buildModelOptions } from '~/utils/runSettings/modelOptions'
import { useModelRouterLaunchControls } from './modelRouterLaunchControls'

const props = defineProps<{ status: ModelRoutingStatus | null; saving: boolean }>()
const emit = defineEmits<{
  (event: 'choose-launch', launch: ModelRouterLaunch): void
  (event: 'open-agent'): void
}>()
const { t } = useLocalization()

const enabled = computed(() => props.status?.enabled ?? false)
const controlsDisabled = computed(() => !enabled.value || props.saving)
const controls = useModelRouterLaunchControls(toRef(props, 'status'), (launch) => emit('choose-launch', launch))
const modelOptions = computed(() => buildModelOptions(controls.thinkingSchema.value, controls.llmConfig.value, {
  default: t('chat.modelOption.default'),
  on: t('chat.modelOption.on'),
  off: t('chat.modelOption.off'),
}))
</script>
