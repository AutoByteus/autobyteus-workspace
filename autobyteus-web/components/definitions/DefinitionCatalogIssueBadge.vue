<template>
  <details
    v-if="entries.length > 0"
    class="definition-catalog-issue mt-2 rounded-md border border-amber-200 bg-amber-50 text-xs text-amber-900"
    data-testid="definition-catalog-issue"
    @click.stop
  >
    <summary class="flex cursor-pointer select-none items-center gap-1.5 px-2 py-1 font-semibold">
      <span aria-hidden="true">⚠</span>
      <span data-testid="definition-catalog-issue-status">{{ t(status.label) }}</span>
      <span data-testid="definition-catalog-issue-count">{{ t('definitionCatalog.issue.count', { count: entries.length }) }}</span>
      <span class="sr-only">{{ t('definitionCatalog.issue.detailsLabel') }}</span>
    </summary>
    <div class="space-y-2 border-t border-amber-200 px-2 py-1.5">
      <p>{{ t(status.explanation) }}</p>
      <ul class="space-y-1.5">
        <li
          v-for="entry in entries"
          :key="`${entry.subject}:${entry.definitionId}`"
          class="space-y-0.5"
          data-testid="definition-catalog-issue-entry"
        >
          <p class="font-semibold">
            {{ entryLabel(entry) }}
            <span v-if="!entry.usingLastGood" class="font-normal">· {{ t('definitionCatalog.issue.noWorkingVersion') }}</span>
          </p>
          <p class="break-all font-mono">{{ t('definitionCatalog.issue.file', { path: entry.definitionPath }) }}</p>
          <p class="break-words">{{ t('definitionCatalog.issue.reason', { reason: entry.reason }) }}</p>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { DefinitionUnitIssue } from '~/types/definitionCatalog'

/**
 * The issues of one card's definition unit: the definition itself first, then nested definitions
 * (team-local agents; org-owned agents and Teams with their local agents). An Agent card passes a
 * one-item list.
 */
const props = defineProps<{ issues?: readonly DefinitionUnitIssue[] | null }>()
const { t } = useLocalization()
const entries = computed(() => props.issues ?? [])

const status = computed(() => {
  if (entries.value[0]?.code === 'DEFINITION_SOURCE_MISSING') {
    return { label: 'definitionCatalog.issue.sourceMissing', explanation: 'definitionCatalog.issue.sourceMissingExplanation' } as const
  }
  if (entries.value.some((entry) => !entry.usingLastGood)) {
    return { label: 'definitionCatalog.issue.membersUnavailable', explanation: 'definitionCatalog.issue.membersUnavailableExplanation' } as const
  }
  return { label: 'definitionCatalog.issue.usingLastGood', explanation: 'definitionCatalog.issue.lastGoodExplanation' } as const
})

/** The definition's name, or its folder when it never loaded. */
const entryLabel = (entry: DefinitionUnitIssue): string => {
  if (entry.name) return entry.name
  const segments = entry.definitionPath.split(/[\\/]/).filter(Boolean)
  const last = segments[segments.length - 1]
  const folder = last?.includes('.') ? segments[segments.length - 2] : last
  return folder ?? entry.definitionId
}
</script>
