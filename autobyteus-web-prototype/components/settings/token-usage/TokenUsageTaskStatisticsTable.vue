<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th class="px-3 py-3" :aria-sort="sortAriaSort('task')">
            <button
              :class="sortHeaderButtonClass('task')"
              type="button"
              :aria-label="sortButtonLabel('task', $t('settings.components.settings.TokenUsageStatistics.taskRun'))"
              :title="sortButtonLabel('task', $t('settings.components.settings.TokenUsageStatistics.taskRun'))"
              @click="toggleSort('task')"
            >
              <span>{{ $t('settings.components.settings.TokenUsageStatistics.taskRun') }}</span>
              <span
                class="inline-flex h-3 w-2 flex-col justify-center gap-0.5"
                aria-hidden="true"
                data-sort-indicator
              >
                <span :class="sortTriangleClass('task', 'asc')" />
                <span :class="sortTriangleClass('task', 'desc')" />
              </span>
            </button>
          </th>
          <th class="px-3 py-3" :aria-sort="sortAriaSort('runtime')">
            <button
              :class="sortHeaderButtonClass('runtime')"
              type="button"
              :aria-label="sortButtonLabel('runtime', $t('settings.components.settings.TokenUsageStatistics.runtime'))"
              :title="sortButtonLabel('runtime', $t('settings.components.settings.TokenUsageStatistics.runtime'))"
              @click="toggleSort('runtime')"
            >
              <span>{{ $t('settings.components.settings.TokenUsageStatistics.runtime') }}</span>
              <span
                class="inline-flex h-3 w-2 flex-col justify-center gap-0.5"
                aria-hidden="true"
                data-sort-indicator
              >
                <span :class="sortTriangleClass('runtime', 'asc')" />
                <span :class="sortTriangleClass('runtime', 'desc')" />
              </span>
            </button>
          </th>
          <th class="px-3 py-3">{{ $t('settings.components.settings.TokenUsageStatistics.models') }}</th>
          <th class="px-3 py-3 text-right" :aria-sort="sortAriaSort('input')">
            <button
              :class="sortHeaderButtonClass('input', true)"
              type="button"
              :aria-label="sortButtonLabel('input', $t('settings.components.settings.TokenUsageStatistics.input'))"
              :title="sortButtonLabel('input', $t('settings.components.settings.TokenUsageStatistics.input'))"
              @click="toggleSort('input')"
            >
              <span>{{ $t('settings.components.settings.TokenUsageStatistics.input') }}</span>
              <span
                class="inline-flex h-3 w-2 flex-col justify-center gap-0.5"
                aria-hidden="true"
                data-sort-indicator
              >
                <span :class="sortTriangleClass('input', 'asc')" />
                <span :class="sortTriangleClass('input', 'desc')" />
              </span>
            </button>
          </th>
          <th class="px-3 py-3 text-right" :aria-sort="sortAriaSort('output')">
            <button
              :class="sortHeaderButtonClass('output', true)"
              type="button"
              :aria-label="sortButtonLabel('output', $t('settings.components.settings.TokenUsageStatistics.output'))"
              :title="sortButtonLabel('output', $t('settings.components.settings.TokenUsageStatistics.output'))"
              @click="toggleSort('output')"
            >
              <span>{{ $t('settings.components.settings.TokenUsageStatistics.output') }}</span>
              <span
                class="inline-flex h-3 w-2 flex-col justify-center gap-0.5"
                aria-hidden="true"
                data-sort-indicator
              >
                <span :class="sortTriangleClass('output', 'asc')" />
                <span :class="sortTriangleClass('output', 'desc')" />
              </span>
            </button>
          </th>
          <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.inputCost') }}</th>
          <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.outputCost') }}</th>
          <th class="px-3 py-3 text-right" :aria-sort="sortAriaSort('totalCost')">
            <button
              :class="sortHeaderButtonClass('totalCost', true)"
              type="button"
              :aria-label="sortButtonLabel('totalCost', $t('settings.components.settings.TokenUsageStatistics.total_cost'))"
              :title="sortButtonLabel('totalCost', $t('settings.components.settings.TokenUsageStatistics.total_cost'))"
              @click="toggleSort('totalCost')"
            >
              <span>{{ $t('settings.components.settings.TokenUsageStatistics.total_cost') }}</span>
              <span
                class="inline-flex h-3 w-2 flex-col justify-center gap-0.5"
                aria-hidden="true"
                data-sort-indicator
              >
                <span :class="sortTriangleClass('totalCost', 'asc')" />
                <span :class="sortTriangleClass('totalCost', 'desc')" />
              </span>
            </button>
          </th>
          <th class="px-3 py-3" :aria-sort="sortAriaSort('createdAt')">
            <button
              :class="sortHeaderButtonClass('createdAt')"
              type="button"
              :aria-label="sortButtonLabel('createdAt', $t('settings.components.settings.TokenUsageStatistics.createdTime'))"
              :title="sortButtonLabel('createdAt', $t('settings.components.settings.TokenUsageStatistics.createdTime'))"
              @click="toggleSort('createdAt')"
            >
              <span>{{ $t('settings.components.settings.TokenUsageStatistics.createdTime') }}</span>
              <span
                class="inline-flex h-3 w-2 flex-col justify-center gap-0.5"
                aria-hidden="true"
                data-sort-indicator
              >
                <span :class="sortTriangleClass('createdAt', 'asc')" />
                <span :class="sortTriangleClass('createdAt', 'desc')" />
              </span>
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
            <td class="px-3 py-3">{{ formatter.formatDistinctValues(entry.row.runtimeKinds, 'runtime') }}</td>
            <td class="px-3 py-3">{{ formatter.formatDistinctValues(entry.row.modelDisplayNames, 'model') }}</td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatInteger(entry.row.aggregate.grossInputTokens) }}</div>
              <div class="text-xs text-gray-500">{{ formatter.cacheSubline(entry.row.aggregate) }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatInteger(entry.row.aggregate.outputTokens) }}</div>
              <div v-if="formatter.thinkingSubline(entry.row.aggregate)" class="text-xs text-gray-500">{{ formatter.thinkingSubline(entry.row.aggregate) }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              {{ formatter.formatCostCell(entry.row.aggregate.estimatedApiInputCost, entry.row.aggregate.currency, entry.row.aggregate.apiCostStatus) }}
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              {{ formatter.formatCostCell(entry.row.aggregate.estimatedApiOutputCost, entry.row.aggregate.currency, entry.row.aggregate.apiCostStatus) }}
            </td>
            <td class="px-3 py-3 text-right font-semibold tabular-nums">
              <button
                class="group ml-auto inline-flex items-center gap-1 rounded font-semibold text-gray-900 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                type="button"
                :aria-controls="detailRowId(entry.row)"
                :aria-expanded="detailRows.has(entry.row.rowId)"
                :aria-label="costDetailsLabel(entry.row)"
                :title="costDetailsLabel(entry.row)"
                @click="toggleDetails(entry.row.rowId)"
              >
                <span class="group-hover:underline">
                  {{ formattedTotalCost(entry.row) }}
                </span>
                <span
                  :class="costDetailArrowClass(entry.row.rowId)"
                  aria-hidden="true"
                  data-cost-detail-indicator
                />
              </button>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
              <div>{{ formatter.formatCreatedAt(entry.row.createdAt) }}</div>
              <div v-if="createdTimeSourceLabel(entry.row.createdTimeSource)" class="text-xs text-amber-600">
                {{ createdTimeSourceLabel(entry.row.createdTimeSource) }}
              </div>
            </td>
          </tr>
          <tr v-if="detailRows.has(entry.row.rowId)" :id="detailRowId(entry.row)" class="bg-blue-50/30">
            <td colspan="9" class="px-3 py-3" :style="{ paddingLeft: `${1 + entry.depth * 1.25}rem` }">
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

const sortHeaderButtonClass = (key: TokenUsageTaskSortKey, alignRight = false): string => (
  [
    alignRight ? 'ml-auto' : '',
    'inline-flex items-center gap-1 rounded py-0.5 font-semibold',
    sortKey.value === key ? 'text-gray-900' : 'text-gray-600',
    'hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
  ].filter(Boolean).join(' ')
);

const sortAriaSort = (key: TokenUsageTaskSortKey): 'ascending' | 'descending' | 'none' => {
  if (sortKey.value !== key) return 'none';
  return sortDirection.value === 'asc' ? 'ascending' : 'descending';
};

const nextSortDirection = (key: TokenUsageTaskSortKey): TokenUsageSortDirection => {
  if (sortKey.value === key) return sortDirection.value === 'asc' ? 'desc' : 'asc';
  return key === 'createdAt' || key === 'totalCost' ? 'desc' : 'asc';
};

const sortButtonLabel = (key: TokenUsageTaskSortKey, columnLabel: string): string => {
  const directionKey = nextSortDirection(key) === 'asc'
    ? 'settings.components.settings.TokenUsageStatistics.sortByColumnAscending'
    : 'settings.components.settings.TokenUsageStatistics.sortByColumnDescending';
  return $t(directionKey, { column: columnLabel });
};

const sortTriangleClass = (key: TokenUsageTaskSortKey, direction: TokenUsageSortDirection): string => {
  const active = sortKey.value === key && sortDirection.value === direction;
  const tone = active ? 'border-current' : 'border-gray-300';
  if (direction === 'asc') return `h-0 w-0 border-x-[3px] border-b-[4px] border-x-transparent ${tone}`;
  return `h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent ${tone}`;
};

const toggleExpanded = (rowId: string): void => {
  if (expandedRows.has(rowId)) expandedRows.delete(rowId);
  else expandedRows.add(rowId);
};

const toggleDetails = (rowId: string): void => {
  if (detailRows.has(rowId)) detailRows.delete(rowId);
  else detailRows.add(rowId);
};

const detailRowId = (row: TokenUsageTaskStatisticsRow): string => `token-usage-cost-details-${row.rowId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

const costDetailArrowClass = (rowId: string): string => {
  const base = 'text-gray-400 group-hover:text-blue-600';
  if (detailRows.has(rowId)) {
    return `${base} h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-current`;
  }
  return `${base} h-0 w-0 border-y-[4px] border-l-[5px] border-y-transparent border-l-current`;
};

const formattedTotalCost = (row: TokenUsageTaskStatisticsRow): string => (
  formatter.formatCostCell(
    row.aggregate.estimatedApiTotalCost,
    row.aggregate.currency,
    row.aggregate.apiCostStatus,
  )
);

const costDetailsLabel = (row: TokenUsageTaskStatisticsRow): string => {
  const key = detailRows.has(row.rowId)
    ? 'settings.components.settings.TokenUsageStatistics.hideCostDetailsForRow'
    : 'settings.components.settings.TokenUsageStatistics.showCostDetailsForRow';
  return $t(key, { row: row.displayName, cost: formattedTotalCost(row) });
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
  if (row.rowKind === 'TASK_TEAM_RUN' && row.runId) {
    return $t('settings.components.settings.TokenUsageStatistics.taskTeamRunIdSuffix', { id: shortId(row.runId) });
  }
  if (row.rowKind === 'TASK_AGENT_RUN' && row.runId) {
    return $t('settings.components.settings.TokenUsageStatistics.taskAgentRunIdSuffix', { id: shortId(row.runId) });
  }
  if (row.rowKind === 'MEMBER_RUN') {
    return row.summary ?? row.displayName;
  }
  return $t('settings.components.settings.TokenUsageStatistics.runIdSuffix', { id: shortId(row.runId) });
};
</script>
