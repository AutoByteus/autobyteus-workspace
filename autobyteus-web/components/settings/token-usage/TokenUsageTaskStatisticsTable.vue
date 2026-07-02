<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th class="px-3 py-3">
            <button class="font-semibold" @click="toggleSort('task')">
              {{ $t('settings.components.settings.TokenUsageStatistics.taskRun') }} {{ sortIndicator('task') }}
            </button>
          </th>
          <th class="px-3 py-3">{{ $t('settings.components.settings.TokenUsageStatistics.type') }}</th>
          <th class="px-3 py-3">
            <button class="font-semibold" @click="toggleSort('runtime')">
              {{ $t('settings.components.settings.TokenUsageStatistics.runtime') }} {{ sortIndicator('runtime') }}
            </button>
          </th>
          <th class="px-3 py-3">{{ $t('settings.components.settings.TokenUsageStatistics.models') }}</th>
          <th class="px-3 py-3 text-right">
            <button class="font-semibold" @click="toggleSort('input')">
              {{ $t('settings.components.settings.TokenUsageStatistics.input') }} {{ sortIndicator('input') }}
            </button>
          </th>
          <th class="px-3 py-3 text-right">
            <button class="font-semibold" @click="toggleSort('output')">
              {{ $t('settings.components.settings.TokenUsageStatistics.output') }} {{ sortIndicator('output') }}
            </button>
          </th>
          <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.inputCost') }}</th>
          <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.outputCost') }}</th>
          <th class="px-3 py-3 text-right">
            <button class="font-semibold" @click="toggleSort('totalCost')">
              {{ $t('settings.components.settings.TokenUsageStatistics.total_cost') }} {{ sortIndicator('totalCost') }}
            </button>
          </th>
          <th class="px-3 py-3">{{ $t('settings.components.settings.TokenUsageStatistics.status') }}</th>
          <th class="px-3 py-3">
            <button class="font-semibold" @click="toggleSort('createdAt')">
              {{ $t('settings.components.settings.TokenUsageStatistics.createdTime') }} {{ sortIndicator('createdAt') }}
            </button>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        <template v-for="entry in visibleRows" :key="entry.row.rowId">
          <tr :class="entry.depth > 0 ? 'align-top bg-gray-50/60 hover:bg-gray-100/60' : 'align-top hover:bg-gray-50'">
            <td class="px-3 py-3 min-w-[20rem]" :style="{ paddingLeft: `${0.75 + entry.depth * 1.25}rem` }">
              <div class="flex items-start gap-2">
                <button
                  v-if="entry.row.children.length"
                  class="mt-0.5 rounded text-gray-500 hover:text-gray-900"
                  type="button"
                  :aria-label="expandedRows.has(entry.row.rowId) ? $t('settings.components.settings.TokenUsageStatistics.collapseTeam') : $t('settings.components.settings.TokenUsageStatistics.expandTeam')"
                  @click="toggleExpanded(entry.row.rowId)"
                >
                  {{ expandedRows.has(entry.row.rowId) ? '▾' : '▸' }}
                </button>
                <span v-else class="w-3" />
                <div>
                  <div class="font-medium text-gray-900">{{ entry.depth > 0 ? '↳ ' : '' }}{{ entry.row.displayName }}</div>
                  <div v-if="entry.row.summary" class="text-xs text-gray-600">“{{ entry.row.summary }}”</div>
                  <div class="text-xs text-gray-500">{{ rowMetadata(entry.row) }}</div>
                </div>
              </div>
            </td>
            <td class="px-3 py-3"><span class="rounded bg-gray-100 px-2 py-1 text-xs font-medium">{{ rowTypeLabel(entry.row.rowKind) }}</span></td>
            <td class="px-3 py-3">{{ formatter.formatDistinctValues(entry.row.runtimeKinds, 'runtime') }}</td>
            <td class="px-3 py-3">{{ formatter.formatDistinctValues(entry.row.models, 'model') }}</td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatCompactInteger(entry.row.aggregate.grossInputTokens) }}</div>
              <div class="text-xs text-gray-500">{{ formatter.cacheSubline(entry.row.aggregate) }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatCompactInteger(entry.row.aggregate.outputTokens) }}</div>
              <div v-if="formatter.thinkingSubline(entry.row.aggregate)" class="text-xs text-gray-500">{{ formatter.thinkingSubline(entry.row.aggregate) }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              <button class="hover:underline" @click="toggleDetails(entry.row.rowId)">
                {{ formatter.formatCostCell(entry.row.aggregate.estimatedApiInputCost, entry.row.aggregate.currency, entry.row.aggregate.apiCostStatus) }}
              </button>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              <button class="hover:underline" @click="toggleDetails(entry.row.rowId)">
                {{ formatter.formatCostCell(entry.row.aggregate.estimatedApiOutputCost, entry.row.aggregate.currency, entry.row.aggregate.apiCostStatus) }}
              </button>
            </td>
            <td class="px-3 py-3 text-right font-semibold tabular-nums">
              <button class="hover:underline" @click="toggleDetails(entry.row.rowId)">
                {{ formatter.formatCostCell(entry.row.aggregate.estimatedApiTotalCost, entry.row.aggregate.currency, entry.row.aggregate.apiCostStatus) }}
              </button>
            </td>
            <td class="px-3 py-3"><span :class="formatter.statusClass(entry.row.aggregate.apiCostStatus)">{{ formatter.formatStatus(entry.row.aggregate.apiCostStatus) }}</span></td>
            <td class="px-3 py-3 whitespace-nowrap">
              <div>{{ formatter.formatCreatedAt(entry.row.createdAt) }}</div>
              <div v-if="createdTimeSourceLabel(entry.row.createdTimeSource)" class="text-xs text-amber-600">
                {{ createdTimeSourceLabel(entry.row.createdTimeSource) }}
              </div>
            </td>
          </tr>
          <tr v-if="detailRows.has(entry.row.rowId)" class="bg-blue-50/30">
            <td colspan="11" class="px-3 py-3" :style="{ paddingLeft: `${1 + entry.depth * 1.25}rem` }">
              <TokenUsageCostBreakdown :aggregate="entry.row.aggregate" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageSortDirection, TokenUsageTaskSortKey, TokenUsageTaskStatisticsRow } from '~/types/tokenUsageStatistics';
import TokenUsageCostBreakdown from './TokenUsageCostBreakdown.vue';
import { createTokenUsageStatisticsFormatter, shortId } from './tokenUsageStatisticsUi';

const props = defineProps<{ rows: TokenUsageTaskStatisticsRow[] }>();

type VisibleTaskRow = {
  row: TokenUsageTaskStatisticsRow;
  depth: number;
};

const { t: $t } = useLocalization();
const formatter = createTokenUsageStatisticsFormatter($t);
const sortKey = ref<TokenUsageTaskSortKey>('createdAt');
const sortDirection = ref<TokenUsageSortDirection>('desc');
const expandedRows = reactive(new Set<string>());
const detailRows = reactive(new Set<string>());

const valueForSort = (row: TokenUsageTaskStatisticsRow): string | number => {
  if (sortKey.value === 'createdAt') return new Date(row.createdAt).getTime();
  if (sortKey.value === 'totalCost') return row.aggregate.estimatedApiTotalCost ?? -1;
  if (sortKey.value === 'input') return row.aggregate.grossInputTokens;
  if (sortKey.value === 'output') return row.aggregate.outputTokens;
  if (sortKey.value === 'runtime') return row.runtimeKinds.join(', ');
  return `${row.displayName} ${row.summary ?? ''}`;
};

const sortedRows = computed(() => [...props.rows].sort((a, b) => {
  const aValue = valueForSort(a);
  const bValue = valueForSort(b);
  const multiplier = sortDirection.value === 'asc' ? 1 : -1;
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return (aValue - bValue) * multiplier || a.rowId.localeCompare(b.rowId);
  }
  return String(aValue).localeCompare(String(bValue)) * multiplier || a.rowId.localeCompare(b.rowId);
}));

const appendVisibleRows = (
  output: VisibleTaskRow[],
  rows: TokenUsageTaskStatisticsRow[],
  depth: number,
): void => {
  for (const row of rows) {
    output.push({ row, depth });
    if (expandedRows.has(row.rowId)) {
      appendVisibleRows(output, row.children, depth + 1);
    }
  }
};

const visibleRows = computed(() => {
  const rows: VisibleTaskRow[] = [];
  appendVisibleRows(rows, sortedRows.value, 0);
  return rows;
});

const toggleSort = (key: TokenUsageTaskSortKey): void => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  sortKey.value = key;
  sortDirection.value = key === 'createdAt' || key === 'totalCost' ? 'desc' : 'asc';
};

const sortIndicator = (key: TokenUsageTaskSortKey): string => {
  if (sortKey.value !== key) return '';
  return sortDirection.value === 'asc' ? '↑' : '↓';
};

const toggleExpanded = (rowId: string): void => {
  if (expandedRows.has(rowId)) expandedRows.delete(rowId);
  else expandedRows.add(rowId);
};

const toggleDetails = (rowId: string): void => {
  if (detailRows.has(rowId)) detailRows.delete(rowId);
  else detailRows.add(rowId);
};

const rowTypeLabel = (rowKind: TokenUsageTaskStatisticsRow['rowKind']): string => {
  if (rowKind === 'TEAM_RUN') return $t('settings.components.settings.TokenUsageStatistics.team');
  if (rowKind === 'AGENT_RUN') return $t('settings.components.settings.TokenUsageStatistics.agent');
  if (rowKind === 'TASK_TEAM_RUN') return $t('settings.components.settings.TokenUsageStatistics.taskTeam');
  if (rowKind === 'TASK_AGENT_RUN') return $t('settings.components.settings.TokenUsageStatistics.taskAgent');
  return $t('settings.components.settings.TokenUsageStatistics.member');
};

const createdTimeSourceLabel = (source: TokenUsageTaskStatisticsRow['createdTimeSource']): string => {
  if (source === 'FIRST_USAGE_OBSERVED') {
    return $t('settings.components.settings.TokenUsageStatistics.firstUsageObserved');
  }
  return '';
};

const rowMetadata = (row: TokenUsageTaskStatisticsRow): string => {
  if (row.rowKind === 'TEAM_RUN' && row.rootTeamRunId) {
    return $t('settings.components.settings.TokenUsageStatistics.teamIdSuffix', { id: shortId(row.rootTeamRunId) });
  }
  if (row.rowKind === 'TASK_TEAM_RUN' && row.taskTeamRunId) {
    return $t('settings.components.settings.TokenUsageStatistics.taskTeamRunIdSuffix', { id: shortId(row.taskTeamRunId) });
  }
  if (row.rowKind === 'TASK_AGENT_RUN' && row.taskAgentRunId) {
    return $t('settings.components.settings.TokenUsageStatistics.taskAgentRunIdSuffix', { id: shortId(row.taskAgentRunId) });
  }
  if (row.rowKind === 'MEMBER_RUN') {
    if (row.memberAgentRunId) {
      return $t('settings.components.settings.TokenUsageStatistics.memberRunIdSuffix', { id: shortId(row.memberAgentRunId) });
    }
    return shortId(row.memberRouteKey);
  }
  return $t('settings.components.settings.TokenUsageStatistics.runIdSuffix', { id: shortId(row.runId) });
};
</script>
