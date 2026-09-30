<template>
  <div
    v-if="issues.length > 0"
    class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    data-testid="skill-name-issues-banner"
  >
    <div class="flex items-start gap-3">
      <Icon icon="heroicons:exclamation-triangle" class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium">{{ $t('skills.nameIssues.banner') }}</p>
          <button
            type="button"
            class="text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
            data-testid="skill-name-issues-toggle"
            :aria-expanded="expanded"
            @click="expanded = !expanded"
          >
            {{ expanded ? $t('skills.nameIssues.hideDetails') : $t('skills.nameIssues.showDetails') }}
          </button>
        </div>
        <ul v-if="expanded" class="mt-3 space-y-2" data-testid="skill-name-issues-details">
          <li
            v-for="issue in issues"
            :key="`${issue.name}:${issue.kind}`"
            class="rounded-md border border-amber-200 bg-white/70 px-3 py-2"
            :data-testid="`skill-name-issue-${issue.kind}-${issue.name}`"
          >
            <div class="flex flex-wrap items-baseline gap-2">
              <span class="font-semibold text-gray-900">{{ issue.name }}</span>
              <span class="text-xs" :class="issue.kind === 'conflict' ? 'text-red-700' : 'text-gray-600'">
                {{ issue.kind === 'conflict' ? $t('skills.nameIssues.conflictHint') : $t('skills.nameIssues.shadowedHint') }}
              </span>
            </div>
            <div class="mt-1 flex min-w-0 items-baseline gap-2 text-xs text-gray-600">
              <span class="shrink-0">{{ $t('skills.nameIssues.used') }}</span>
              <span class="truncate font-mono text-gray-800" :title="issue.usedPath">{{ issue.usedPath }}</span>
            </div>
            <div
              v-for="ignoredPath in issue.ignoredPaths"
              :key="ignoredPath"
              class="mt-0.5 flex min-w-0 items-baseline gap-2 text-xs text-gray-600"
            >
              <span class="shrink-0">{{ $t('skills.nameIssues.ignored') }}</span>
              <span class="truncate font-mono text-gray-500" :title="ignoredPath">{{ ignoredPath }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useSkillNamesStore } from '~/stores/skillNamesStore'

/**
 * Skills page warning for copies of a name the catalog ignores (D-19, REQ-024). The ignored copies
 * are read-only here: the user fixes them on disk or resolves the duplicate.
 */
const { issues } = storeToRefs(useSkillNamesStore())
const expanded = ref(false)
</script>
