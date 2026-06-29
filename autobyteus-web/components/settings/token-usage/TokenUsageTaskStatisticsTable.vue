<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th class="px-3 py-3">
            <button class="font-semibold" @click="toggleSort('createdAt')">
              {{ $t('settings.components.settings.TokenUsageStatistics.createdTime') }} {{ sortIndicator('createdAt') }}
            </button>
          </th>
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
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        <template v-for="row in sortedRows" :key="row.rowId">
          <tr class="align-top hover:bg-gray-50">
            <td class="px-3 py-3 whitespace-nowrap">
              <div>{{ formatter.formatCreatedAt(row.createdAt) }}</div>
              <div v-if="row.createdTimeSource === 'FIRST_USAGE_OBSERVED'" class="text-xs text-amber-600">
                {{ $t('settings.components.settings.TokenUsageStatistics.firstUsageObserved') }}
              </div>
            </td>
            <td class="px-3 py-3 min-w-[20rem]">
              <div class="flex items-start gap-2">
                <button
                  v-if="row.members.length"
                  class="mt-0.5 rounded text-gray-500 hover:text-gray-900"
                  type="button"
                  :aria-label="expandedRows.has(row.rowId) ? $t('settings.components.settings.TokenUsageStatistics.collapseTeam') : $t('settings.components.settings.TokenUsageStatistics.expandTeam')"
                  @click="toggleExpanded(row.rowId)"
                >
                  {{ expandedRows.has(row.rowId) ? '▾' : '▸' }}
                </button>
                <span v-else class="w-3" />
                <div>
                  <div class="font-medium text-gray-900">{{ row.displayName }}</div>
                  <div v-if="row.summary" class="text-xs text-gray-600">“{{ row.summary }}”</div>
                  <div class="text-xs text-gray-500">{{ rowMetadata(row) }}</div>
                </div>
              </div>
            </td>
            <td class="px-3 py-3"><span class="rounded bg-gray-100 px-2 py-1 text-xs font-medium">{{ rowTypeLabel(row.rowKind) }}</span></td>
            <td class="px-3 py-3">{{ formatter.formatDistinctValues(row.runtimeKinds, 'runtime') }}</td>
            <td class="px-3 py-3">{{ formatter.formatDistinctValues(row.models, 'model') }}</td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatCompactInteger(row.aggregate.grossInputTokens) }}</div>
              <div class="text-xs text-gray-500">{{ formatter.cacheSubline(row.aggregate) }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatCompactInteger(row.aggregate.outputTokens) }}</div>
              <div v-if="formatter.thinkingSubline(row.aggregate)" class="text-xs text-gray-500">{{ formatter.thinkingSubline(row.aggregate) }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              <button class="hover:underline" @click="toggleDetails(row.rowId)">
                {{ formatter.formatCostCell(row.aggregate.estimatedApiInputCost, row.aggregate.currency, row.aggregate.apiCostStatus) }}
              </button>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              <button class="hover:underline" @click="toggleDetails(row.rowId)">
                {{ formatter.formatCostCell(row.aggregate.estimatedApiOutputCost, row.aggregate.currency, row.aggregate.apiCostStatus) }}
              </button>
            </td>
            <td class="px-3 py-3 text-right font-semibold tabular-nums">
              <button class="hover:underline" @click="toggleDetails(row.rowId)">
                {{ formatter.formatCostCell(row.aggregate.estimatedApiTotalCost, row.aggregate.currency, row.aggregate.apiCostStatus) }}
              </button>
            </td>
            <td class="px-3 py-3"><span :class="formatter.statusClass(row.aggregate.apiCostStatus)">{{ formatter.formatStatus(row.aggregate.apiCostStatus) }}</span></td>
          </tr>
          <tr v-if="detailRows.has(row.rowId)" class="bg-blue-50/30">
            <td colspan="11" class="px-3 py-3">
              <TokenUsageCostBreakdown :aggregate="row.aggregate" />
            </td>
          </tr>
          <template v-if="expandedRows.has(row.rowId)">
            <template v-for="member in row.members" :key="member.rowId">
              <tr class="align-top bg-gray-50/60 hover:bg-gray-100/60">
                <td class="px-3 py-3 whitespace-nowrap pl-8">
                  <div>{{ formatter.formatCreatedAt(member.createdAt) }}</div>
                  <div v-if="member.createdTimeSource === 'FIRST_USAGE_OBSERVED'" class="text-xs text-amber-600">
                    {{ $t('settings.components.settings.TokenUsageStatistics.firstUsageObserved') }}
                  </div>
                </td>
                <td class="px-3 py-3 min-w-[20rem] pl-8">
                  <div class="font-medium text-gray-900">↳ {{ member.memberName }}</div>
                  <div class="text-xs text-gray-500">{{ memberMetadata(member) }}</div>
                </td>
                <td class="px-3 py-3"><span class="rounded bg-white px-2 py-1 text-xs font-medium">{{ $t('settings.components.settings.TokenUsageStatistics.member') }}</span></td>
                <td class="px-3 py-3">{{ formatter.formatDistinctValues(member.runtimeKinds, 'runtime') }}</td>
                <td class="px-3 py-3">{{ formatter.formatDistinctValues(member.models, 'model') }}</td>
                <td class="px-3 py-3 text-right tabular-nums">
                  <div>{{ formatter.formatCompactInteger(member.aggregate.grossInputTokens) }}</div>
                  <div class="text-xs text-gray-500">{{ formatter.cacheSubline(member.aggregate) }}</div>
                </td>
                <td class="px-3 py-3 text-right tabular-nums">
                  <div>{{ formatter.formatCompactInteger(member.aggregate.outputTokens) }}</div>
                  <div v-if="formatter.thinkingSubline(member.aggregate)" class="text-xs text-gray-500">{{ formatter.thinkingSubline(member.aggregate) }}</div>
                </td>
                <td class="px-3 py-3 text-right tabular-nums"><button class="hover:underline" @click="toggleDetails(member.rowId)">{{ formatter.formatCostCell(member.aggregate.estimatedApiInputCost, member.aggregate.currency, member.aggregate.apiCostStatus) }}</button></td>
                <td class="px-3 py-3 text-right tabular-nums"><button class="hover:underline" @click="toggleDetails(member.rowId)">{{ formatter.formatCostCell(member.aggregate.estimatedApiOutputCost, member.aggregate.currency, member.aggregate.apiCostStatus) }}</button></td>
                <td class="px-3 py-3 text-right font-semibold tabular-nums">
                  <button class="hover:underline" @click="toggleDetails(member.rowId)">
                    {{ formatter.formatCostCell(member.aggregate.estimatedApiTotalCost, member.aggregate.currency, member.aggregate.apiCostStatus) }}
                  </button>
                </td>
                <td class="px-3 py-3"><span :class="formatter.statusClass(member.aggregate.apiCostStatus)">{{ formatter.formatStatus(member.aggregate.apiCostStatus) }}</span></td>
              </tr>
              <tr v-if="detailRows.has(member.rowId)" class="bg-blue-50/30">
                <td colspan="11" class="px-3 py-3 pl-10">
                  <TokenUsageCostBreakdown :aggregate="member.aggregate" />
                </td>
              </tr>
            </template>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageSortDirection, TokenUsageTaskMemberStatisticsRow, TokenUsageTaskSortKey, TokenUsageTaskStatisticsRow } from '~/types/tokenUsageStatistics';
import TokenUsageCostBreakdown from './TokenUsageCostBreakdown.vue';
import { createTokenUsageStatisticsFormatter, shortId } from './tokenUsageStatisticsUi';

const props = defineProps<{ rows: TokenUsageTaskStatisticsRow[] }>();

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

const rowTypeLabel = (rowKind: TokenUsageTaskStatisticsRow['rowKind']): string => (
  rowKind === 'TEAM_RUN'
    ? $t('settings.components.settings.TokenUsageStatistics.team')
    : $t('settings.components.settings.TokenUsageStatistics.agent')
);

const rowMetadata = (row: TokenUsageTaskStatisticsRow): string => {
  const id = row.rootTeamRunId
    ? $t('settings.components.settings.TokenUsageStatistics.teamIdSuffix', { id: shortId(row.rootTeamRunId) })
    : $t('settings.components.settings.TokenUsageStatistics.runIdSuffix', { id: shortId(row.runId) });
  return [row.workspaceName, id].filter(Boolean).join(' · ');
};

const memberMetadata = (member: TokenUsageTaskMemberStatisticsRow): string => {
  const id = member.memberAgentRunId
    ? $t('settings.components.settings.TokenUsageStatistics.memberRunIdSuffix', { id: shortId(member.memberAgentRunId) })
    : shortId(member.memberRouteKey);
  const path = member.memberPath.length ? member.memberPath.join(' / ') : '';
  return [path, id].filter(Boolean).join(' · ');
};
</script>
