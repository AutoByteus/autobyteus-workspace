<template>
  <section class="mt-3 rounded-lg border border-slate-200 bg-white p-4">
    <div class="flex flex-wrap items-center gap-2">
      <h4 class="text-sm font-semibold text-slate-900">{{ title }}</h4>
      <span class="text-xs text-slate-500">Source: {{ report.sourceNodeId }}</span>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <span
        v-for="entityType in report.scope"
        :key="entityType"
        class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
      >
        {{ entityTypeLabel(entityType) }}
      </span>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
      <div
        v-for="entry in report.exportByEntity"
        :key="entry.entityType"
        class="rounded border border-slate-200 p-3"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">{{ entityTypeLabel(entry.entityType) }}</p>
        <p class="mt-1 text-sm text-slate-900">{{ entry.exportedCount }} exported</p>
        <p class="mt-1 text-xs text-slate-600 break-all">
          {{ formatSampleKeys(entry.sampledKeys) }}
        </p>
        <p v-if="entry.sampleTruncated" class="mt-1 text-xs text-amber-700">
          Key sample truncated.
        </p>
      </div>
    </div>

    <div class="mt-4 space-y-2">
      <div
        v-for="target in report.targets"
        :key="target.targetNodeId"
        class="rounded border border-slate-200 p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-semibold text-slate-900">{{ target.targetNodeId }}</p>
          <span
            class="rounded px-2 py-0.5 text-xs"
            :class="target.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ target.status }}
          </span>
          <span class="text-xs text-slate-600">
            failures: {{ target.failureCountTotal }}
          </span>
        </div>

        <p v-if="target.message" class="mt-1 text-xs text-slate-700 break-all">
          {{ target.message }}
        </p>

        <p v-if="target.summary" class="mt-1 text-xs text-slate-600">
          processed {{ target.summary.processed }}, created {{ target.summary.created }}, updated {{ target.summary.updated }}, deleted {{ target.summary.deleted }}, skipped {{ target.summary.skipped }}
        </p>

        <button
          v-if="target.failureSamples.length > 0"
          type="button"
          class="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
          @click="toggleFailureDetails(target.targetNodeId)"
        >
          {{ isExpanded(target.targetNodeId) ? 'Hide' : 'Show' }} failure samples ({{ target.failureSamples.length }})
        </button>

        <ul
          v-if="isExpanded(target.targetNodeId) && target.failureSamples.length > 0"
          class="mt-2 space-y-1"
        >
          <li
            v-for="(failure, index) in target.failureSamples"
            :key="`${target.targetNodeId}-${index}`"
            class="rounded bg-slate-50 px-2 py-1 text-xs text-slate-700 break-all"
          >
            [{{ entityTypeLabel(failure.entityType) }}] {{ failure.key }}: {{ failure.message }}
          </li>
        </ul>

        <p v-if="target.failureSampleTruncated" class="mt-2 text-xs text-amber-700">
          Failure sample truncated.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { NodeSyncRunReport, SyncEntityType } from '~/types/nodeSync';

const props = withDefaults(defineProps<{
  report: NodeSyncRunReport;
  title?: string;
}>(), {
  title: 'Sync Report',
});

const expandedTargetIds = ref<Record<string, boolean>>({});

function entityTypeLabel(entityType: SyncEntityType): string {
  switch (entityType) {
    case 'prompt':
      return 'Prompts';
    case 'agent_definition':
      return 'Agents';
    case 'agent_team_definition':
      return 'Agent Teams';
    case 'mcp_server_configuration':
      return 'MCP Servers';
    default:
      return entityType;
  }
}

function formatSampleKeys(keys: string[]): string {
  if (keys.length === 0) {
    return 'No sampled keys.';
  }
  return keys.join(', ');
}

function toggleFailureDetails(targetNodeId: string): void {
  expandedTargetIds.value[targetNodeId] = !expandedTargetIds.value[targetNodeId];
}

function isExpanded(targetNodeId: string): boolean {
  return Boolean(expandedTargetIds.value[targetNodeId]);
}
</script>
