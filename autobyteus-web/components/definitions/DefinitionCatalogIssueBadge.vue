<template>
  <details
    v-if="issue"
    class="definition-catalog-issue mt-2 rounded-md border border-amber-200 bg-amber-50 text-xs text-amber-900"
    data-testid="definition-catalog-issue"
    @click.stop
  >
    <summary class="flex cursor-pointer select-none items-center gap-1.5 px-2 py-1 font-semibold">
      <span aria-hidden="true">⚠</span>
      <span>{{ isSourceMissing ? t('definitionCatalog.issue.sourceMissing') : t('definitionCatalog.issue.usingLastGood') }}</span>
      <span class="sr-only">{{ t('definitionCatalog.issue.detailsLabel') }}</span>
    </summary>
    <div class="space-y-1 border-t border-amber-200 px-2 py-1.5">
      <p>{{ isSourceMissing ? t('definitionCatalog.issue.sourceMissingExplanation') : t('definitionCatalog.issue.lastGoodExplanation') }}</p>
      <p class="break-all font-mono">{{ t('definitionCatalog.issue.file', { path: issue.definitionPath }) }}</p>
      <p class="break-words">{{ t('definitionCatalog.issue.reason', { reason: issue.reason }) }}</p>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { DefinitionCatalogIssue } from '~/types/definitionCatalog'

/** Marks a listed definition that is served from its last working version, with the file and reason. */
const props = defineProps<{ issue?: DefinitionCatalogIssue | null }>()
const { t } = useLocalization()
const isSourceMissing = computed(() => props.issue?.code === 'DEFINITION_SOURCE_MISSING')
</script>
