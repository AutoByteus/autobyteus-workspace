<template>
  <section :class="containerClass">
    <div :class="cardClass">
      <h2 :class="headingClass">{{ $t('agents.components.agents.AgentDetail.description') }}</h2>
      <p class="whitespace-pre-wrap text-gray-600">{{ agentDef.description }}</p>
      <div class="mt-4 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">{{ $t('agents.components.agents.AgentDetail.category') }}</p>
          <p class="mt-1 text-sm text-gray-700">{{ agentDef.category || $t('agents.components.agents.AgentDetail.uncategorized') }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">{{ $t('agents.components.agents.AgentDetail.defaultRuntime') }}</p>
          <p class="mt-1 text-sm text-gray-700">{{ agentDef.defaultLaunchConfig?.runtimeKind || $t('agents.components.agents.AgentDetail.notSet') }}</p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">{{ $t('agents.components.agents.AgentDetail.defaultModel') }}</p>
          <p class="mt-1 break-all text-sm text-gray-700">{{ agentDef.defaultLaunchConfig?.llmModelIdentifier || $t('agents.components.agents.AgentDetail.notSet') }}</p>
        </div>
      </div>
    </div>

    <ExpandableInstructionCard
      :content="agentDef.instructions"
      variant="gray"
    />

    <div :class="cardClass">
      <h2 :class="headingWithMarginClass">{{ $t('agents.components.agents.AgentDetail.skillsHeading') }}</h2>
      <ul v-if="agentDef.skillNames && agentDef.skillNames.length" class="space-y-2">
        <li v-for="item in agentDef.skillNames" :key="item" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm text-gray-800">
          {{ item }}
        </li>
      </ul>
      <p v-else class="text-sm italic text-gray-500">{{ $t('agents.components.agents.AgentDetail.none_configured') }}</p>
    </div>

    <div :class="cardClass">
      <h2 :class="headingWithMarginClass">{{ $t('agents.components.agents.AgentDetail.toolsHeading') }}</h2>
      <ul v-if="agentDef.toolNames && agentDef.toolNames.length" class="space-y-2">
        <li v-for="item in agentDef.toolNames" :key="item" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm text-gray-800">
          {{ item }}
        </li>
      </ul>
      <p v-else class="text-sm italic text-gray-500">{{ $t('agents.components.agents.AgentDetail.none_configured') }}</p>
    </div>

    <details v-if="optionalProcessorLists.length" :class="cardClass">
      <summary :class="summaryClass">{{ $t('agents.components.agents.AgentDetail.optional_processors_advanced') }}</summary>
      <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div v-for="list in optionalProcessorLists" :key="list.title">
          <h3 class="mb-3 font-semibold text-gray-800">{{ list.title }}</h3>
          <ul class="space-y-2">
            <li v-for="item in agentDef[list.key]" :key="item" class="rounded-md border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm text-gray-800">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentDefinition } from '~/stores/agentDefinitionStore';
import ExpandableInstructionCard from '~/components/common/ExpandableInstructionCard.vue';
import { useLocalization } from '~/composables/useLocalization';

const props = withDefaults(defineProps<{
  agentDef: AgentDefinition;
  variant?: 'page' | 'embedded';
}>(), {
  variant: 'page',
});

const { t: $t } = useLocalization();

type AgentDefinitionArrayField =
  | 'toolNames'
  | 'inputProcessorNames'
  | 'llmResponseProcessorNames'
  | 'systemPromptProcessorNames'
  | 'toolExecutionResultProcessorNames'
  | 'toolInvocationPreprocessorNames'
  | 'lifecycleProcessorNames';

const componentLists: Array<{ title: string; key: AgentDefinitionArrayField }> = [
  { title: $t('agents.components.agents.AgentDetail.optionalProcessor.tools'), key: 'toolNames' },
  { title: $t('agents.components.agents.AgentDetail.optionalProcessor.inputProcessors'), key: 'inputProcessorNames' },
  { title: $t('agents.components.agents.AgentDetail.optionalProcessor.llmResponseProcessors'), key: 'llmResponseProcessorNames' },
  { title: $t('agents.components.agents.AgentDetail.optionalProcessor.systemPromptProcessors'), key: 'systemPromptProcessorNames' },
  { title: $t('agents.components.agents.AgentDetail.optionalProcessor.toolExecutionResultProcessors'), key: 'toolExecutionResultProcessorNames' },
  { title: $t('agents.components.agents.AgentDetail.optionalProcessor.toolInvocationPreprocessors'), key: 'toolInvocationPreprocessorNames' },
  { title: $t('agents.components.agents.AgentDetail.optionalProcessor.lifecycleProcessors'), key: 'lifecycleProcessorNames' },
];

const optionalProcessorLists = computed(() => componentLists
  .filter((list) => list.key !== 'toolNames')
  .filter((list) => Array.isArray(props.agentDef[list.key]) && props.agentDef[list.key].length > 0));

const containerClass = computed(() => (props.variant === 'embedded' ? 'space-y-4' : 'space-y-6'));
const cardClass = computed(() => (props.variant === 'embedded'
  ? 'rounded-lg border border-slate-200 bg-white p-4'
  : 'rounded-xl border border-gray-200 bg-white p-5'));
const headingTextClass = computed(() => (props.variant === 'embedded'
  ? 'text-base font-semibold text-gray-800'
  : 'text-lg font-semibold text-gray-800'));
const headingClass = computed(() => `${headingTextClass.value} mb-2`);
const headingWithMarginClass = computed(() => `${headingTextClass.value} mb-3`);
const summaryClass = computed(() => `${headingTextClass.value} cursor-pointer`);
</script>
