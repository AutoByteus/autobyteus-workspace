<template>
  <details
    v-if="entries.length > 0"
    class="definition-load-issue mt-2 rounded-md border border-amber-200 bg-amber-50 text-xs text-amber-900"
    data-testid="definition-load-issue"
    @click.stop
  >
    <summary class="flex cursor-pointer select-none items-center gap-1.5 px-2 py-1 font-semibold">
      <span aria-hidden="true">⚠</span>
      <span data-testid="definition-load-issue-status">{{ t(status.label) }}</span>
      <span data-testid="definition-load-issue-count">{{ t('agentPackageDefinitions.issue.count', { count: entries.length }) }}</span>
      <span class="sr-only">{{ t('agentPackageDefinitions.issue.detailsLabel') }}</span>
    </summary>
    <div class="space-y-2 border-t border-amber-200 px-2 py-1.5">
      <p>{{ t(status.explanation) }}</p>
      <ul class="space-y-1.5">
        <li
          v-for="entry in entries"
          :key="`${entry.kind}:${entry.definitionId}`"
          class="space-y-0.5"
          data-testid="definition-load-issue-entry"
        >
          <p class="font-semibold">
            {{ entryLabel(entry) }}
            <span v-if="!entry.usingLastGood" class="font-normal">· {{ t('agentPackageDefinitions.issue.noWorkingVersion') }}</span>
          </p>
          <p class="break-all font-mono">{{ t('agentPackageDefinitions.issue.file', { path: entry.definitionPath }) }}</p>
          <p class="break-words">{{ t('agentPackageDefinitions.issue.reason', { reason: entry.reason }) }}</p>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { DefinitionLoadIssueEntry } from '~/types/agentPackageDefinitions'

/**
 * The issues of one card's definition unit: the definition itself first, then nested definitions
 * (team-local agents; org-owned agents and Teams with their local agents). An Agent card passes a
 * one-item list.
 */
const props = defineProps<{ issues?: readonly DefinitionLoadIssueEntry[] | null }>()
const { t } = useLocalization()
const entries = computed(() => props.issues ?? [])

const status = computed(() => {
  if (entries.value[0]?.code === 'DEFINITION_SOURCE_UNAVAILABLE') {
    return { label: 'agentPackageDefinitions.issue.sourceMissing', explanation: 'agentPackageDefinitions.issue.sourceMissingExplanation' } as const
  }
  if (entries.value.some((entry) => !entry.usingLastGood)) {
    return { label: 'agentPackageDefinitions.issue.membersUnavailable', explanation: 'agentPackageDefinitions.issue.membersUnavailableExplanation' } as const
  }
  return { label: 'agentPackageDefinitions.issue.usingLastGood', explanation: 'agentPackageDefinitions.issue.lastGoodExplanation' } as const
})

/** The definition's name, or its folder when it never loaded. */
const entryLabel = (entry: DefinitionLoadIssueEntry): string => {
  if (entry.name) return entry.name
  const segments = entry.definitionPath.split(/[\\/]/).filter(Boolean)
  const last = segments[segments.length - 1]
  const folder = last?.includes('.') ? segments[segments.length - 2] : last
  return folder ?? entry.definitionId
}
</script>
