<template>
  <!-- The focused agent's (or a Team copy's) settings: the same facts as its row in a list, always open. -->
  <div class="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm" :data-test="testId" :data-source="node.sourceKey">
    <p v-if="node.routing?.reason" class="py-1 text-xs text-gray-500" data-test="run-member-routing-reason">
      {{ node.routing.reason }}
      <button
        v-if="node.routing.decision"
        type="button"
        class="ml-1 whitespace-nowrap font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:underline"
        data-test="run-member-view-decision"
        @click="openDecision"
      >{{ $t('runSettings.delegated.viewDecision') }}</button>
    </p>
    <p
      v-for="(note, index) in noteTexts"
      :key="index"
      class="flex min-w-0 items-start gap-1 py-1 text-xs text-amber-700"
      data-test="run-member-launch-note"
    >
      <Icon icon="heroicons:exclamation-triangle" class="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span class="min-w-0">{{ note }}</span>
    </p>
    <RunSettingsCard
      :values="node.values"
      :fields="node.fields"
      :member="node"
      :locked="flags"
      :runtime-locked="Boolean(flags.model)"
      :locked-models="lockedModels"
      :test-suffix="testSuffix"
      @change="emit('change', $event)"
    />
    <p v-if="sourceLine" class="px-0 py-1 text-xs text-gray-500" data-test="run-subject-source">{{ sourceLine }}</p>
    <!-- A running copy's model is locked until it is stopped. -->
    <p v-if="node.delegated?.running" class="flex items-center gap-1.5 py-1 text-xs text-gray-500" role="status" data-test="run-member-stop-hint">
      <Icon icon="heroicons:lock-closed" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{{ $t('runSettings.delegated.stopToChange') }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ChatModelOption } from '~/composables/chat/useChatModelCatalog'
import type { RunMemberSettingChange, RunSettingFlags } from '~/types/runSettings/RunSettings'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'
import RunSettingsCard from './RunSettingsCard.vue'
import { useRunMemberFacts } from './useRunMemberFacts'

const props = withDefaults(defineProps<{
  node: RunMemberNode
  /** The section's locks; a row's own locks replace them. */
  locked: RunSettingFlags
  lockedModels?: readonly ChatModelOption[] | null
  testId?: string
  testSuffix?: string
}>(), { lockedModels: null, testId: 'existing-run-subject-card', testSuffix: 'subject' })

const emit = defineEmits<{ (event: 'change', change: RunMemberSettingChange): void }>()

const { noteTexts, sourceLabel, openDecision } = useRunMemberFacts(() => props.node)
const flags = computed(() => props.node.locked ?? props.locked)
const sourceLine = computed(() => [sourceLabel.value, props.node.routing?.taskKind].filter(Boolean).join(' · '))
</script>
