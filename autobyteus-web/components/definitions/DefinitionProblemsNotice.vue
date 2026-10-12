<template>
  <details
    v-if="problems.length > 0"
    class="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900"
    data-testid="definition-problems-notice"
  >
    <summary class="cursor-pointer select-none px-4 py-2 font-semibold">{{ title }}</summary>
    <ul class="space-y-2 border-t border-amber-200 px-4 py-3">
      <li v-for="entry in problems" :key="`${entry.definitionId}:${entry.definitionPath}`" class="space-y-0.5">
        <p class="font-semibold">{{ entry.definitionId }}</p>
        <p class="break-words">{{ t('agentPackageDefinitions.issue.reason', { reason: entry.reason }) }}</p>
        <p class="break-all font-mono text-xs">{{ t('agentPackageDefinitions.issue.file', { path: entry.definitionPath }) }}</p>
        <p v-if="entry.dependencyChain.length > 0" class="break-all text-xs">
          {{ t('agentPackageDefinitions.notice.dependency', { chain: entry.dependencyChain.join(' → ') }) }}
        </p>
      </li>
    </ul>
  </details>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useDefinitionProblemsStore } from '~/stores/definitionProblemsStore'
import type { DefinitionKind } from '~/types/agentPackageDefinitions'

/** Lists the definitions of one kind that cannot be used (no last working version), with file and reason. */
const props = defineProps<{ kind: DefinitionKind }>()
const { t } = useLocalization()
const store = useDefinitionProblemsStore()
const problems = computed(() => (store.problemsByKind[props.kind] ?? []).filter((entry) => !entry.usingLastGood))
const TITLE_KEYS: Record<DefinitionKind, string> = {
  AGENT: 'agentPackageDefinitions.notice.agentsTitle',
  AGENT_TEAM: 'agentPackageDefinitions.notice.teamsTitle',
  AGENT_ORG: 'agentPackageDefinitions.notice.orgsTitle',
}
const title = computed(() => t(TITLE_KEYS[props.kind], { count: problems.value.length }))
onMounted(() => { void store.ensureLoaded(props.kind) })
</script>
