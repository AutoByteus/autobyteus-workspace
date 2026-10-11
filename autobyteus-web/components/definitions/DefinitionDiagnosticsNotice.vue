<template>
  <details
    v-if="diagnostics.length > 0"
    class="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900"
    data-testid="definition-diagnostics-notice"
  >
    <summary class="cursor-pointer select-none px-4 py-2 font-semibold">{{ title }}</summary>
    <ul class="space-y-2 border-t border-amber-200 px-4 py-3">
      <li v-for="entry in diagnostics" :key="`${entry.definitionId}:${entry.definitionPath}`" class="space-y-0.5">
        <p class="font-semibold">{{ entry.definitionId }}</p>
        <p class="break-words">{{ t('definitionCatalog.issue.reason', { reason: entry.reason }) }}</p>
        <p class="break-all font-mono text-xs">{{ t('definitionCatalog.issue.file', { path: entry.definitionPath }) }}</p>
        <p v-if="entry.dependencyChain.length > 0" class="break-all text-xs">
          {{ t('definitionCatalog.notice.dependency', { chain: entry.dependencyChain.join(' → ') }) }}
        </p>
      </li>
    </ul>
  </details>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useDefinitionDiagnosticsStore } from '~/stores/definitionDiagnosticsStore'
import type { DefinitionDiagnosticSubject } from '~/types/definitionCatalog'

/** Lists the definitions of one subject that are not available (no last working version), with file and reason. */
const props = defineProps<{ subject: DefinitionDiagnosticSubject }>()
const { t } = useLocalization()
const store = useDefinitionDiagnosticsStore()
const diagnostics = computed(() => (store.diagnosticsBySubject[props.subject] ?? []).filter((entry) => !entry.usingLastGood))
const TITLE_KEYS: Record<DefinitionDiagnosticSubject, string> = {
  AGENT: 'definitionCatalog.notice.agentsTitle',
  AGENT_TEAM: 'definitionCatalog.notice.teamsTitle',
  AGENT_ORG: 'definitionCatalog.notice.orgsTitle',
}
const title = computed(() => t(TITLE_KEYS[props.subject], { count: diagnostics.value.length }))
onMounted(() => { void store.ensureLoaded(props.subject) })
</script>
