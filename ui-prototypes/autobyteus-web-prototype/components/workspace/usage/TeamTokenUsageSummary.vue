<template>
  <section class="team-token-usage-summary rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-test="team-token-usage-summary">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ $t('shell.tokenUsage.teamHeading') }}</h3>
        <p class="mt-1 text-xs text-slate-500">{{ $t('shell.tokenUsage.teamSubtitle') }}</p>
      </div>
    </div>

    <div
      class="team-token-table-scroll"
      data-test="team-token-table-scroll"
      tabindex="0"
      :aria-label="$t('shell.tokenUsage.teamHeading')"
    >
      <table class="team-token-table" data-test="team-token-table">
        <colgroup>
          <col class="team-token-column-member">
          <col class="team-token-column-gross-input">
          <col class="team-token-column-output">
          <col class="team-token-column-total">
        </colgroup>
        <thead>
          <tr>
            <th scope="col">{{ $t('shell.tokenUsage.teamMember') }}</th>
            <th scope="col">{{ $t('shell.tokenUsage.grossInput') }}</th>
            <th scope="col">{{ $t('shell.tokenUsage.output') }}</th>
            <th scope="col">{{ $t('shell.tokenUsage.totalMetric') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0" class="team-token-state-row">
            <td class="team-token-state-cell" colspan="4">
              {{ $t('shell.tokenUsage.teamNoMembers') }}
            </td>
          </tr>

          <tr
            v-for="row in rows"
            :key="row.agentRunId"
            class="team-token-row"
            :class="{ 'team-token-row-focused': row.isFocused }"
            data-test="team-token-row"
            :data-focused="row.isFocused ? 'true' : 'false'"
            :data-member-address="row.memberAddress"
          >
            <th scope="row" class="team-token-member-cell">
              <span class="team-token-member-primary">
                <span class="team-token-member-name" :title="row.displayName">
                  {{ row.displayName }}
                </span>
                <span v-if="row.isFocused" class="team-token-focused-badge">
                  {{ $t('shell.tokenUsage.focusedBadge') }}
                </span>
              </span>
              <span v-if="row.memberAddress !== row.displayName" class="team-token-route" :title="row.memberAddress">{{ row.memberAddress }}</span>
            </th>

            <template v-if="row.summary">
              <td class="team-token-metric-cell">
                <span class="team-token-metric-primary" :title="formatTokenDetail(row.summary.grossInputTokens)">{{ formatCompactInteger(row.summary.grossInputTokens) }}</span>
                <span class="team-token-metric-cost" :title="formatCost(row.summary.estimatedApiInputCost, row.summary.currency, row.summary.apiCostStatus)">
                  {{ formatCost(row.summary.estimatedApiInputCost, row.summary.currency, row.summary.apiCostStatus) }}
                </span>
              </td>
              <td class="team-token-metric-cell">
                <span class="team-token-metric-primary" :title="formatTokenDetail(row.summary.outputTokens)">{{ formatCompactInteger(row.summary.outputTokens) }}</span>
                <span class="team-token-metric-cost" :title="formatCost(row.summary.estimatedApiOutputCost, row.summary.currency, row.summary.apiCostStatus)">
                  {{ formatCost(row.summary.estimatedApiOutputCost, row.summary.currency, row.summary.apiCostStatus) }}
                </span>
              </td>
              <td class="team-token-metric-cell team-token-total-metric-cell">
                <span class="team-token-metric-primary team-token-total-value" :title="formatTokenDetail(row.summary.totalTokens)">{{ formatCompactInteger(row.summary.totalTokens) }}</span>
                <span class="team-token-metric-cost-line" :title="formatTotalCostTitle(row.summary.estimatedApiTotalCost, row.summary.currency, row.summary.apiCostStatus)">
                  <span class="team-token-metric-cost">
                    {{ formatCost(row.summary.estimatedApiTotalCost, row.summary.currency, row.summary.apiCostStatus) }}
                  </span>
                  <span v-if="shouldShowMetricStatus(row.summary.apiCostStatus)" class="team-token-metric-status">
                    <span :class="compactStatusClass(row.summary.apiCostStatus)">{{ formatStatus(row.summary.apiCostStatus) }}</span>
                  </span>
                </span>
              </td>
            </template>

            <td v-else class="team-token-empty-cell" colspan="3">
              <span v-if="row.loading">{{ $t('shell.tokenUsage.teamLoading') }}</span>
              <span v-else-if="row.error">{{ $t('shell.tokenUsage.teamUnavailable') }}</span>
              <span v-else>{{ $t('shell.tokenUsage.teamNoUsage') }}</span>
            </td>
          </tr>

          <tr
            v-if="teamTotalSummary"
            class="team-token-total-row"
            data-test="team-token-total-row"
          >
            <th scope="row" class="team-token-member-cell">
              <span class="team-token-member-primary">
                <span class="team-token-member-name">
                  {{ $t('shell.tokenUsage.teamTotal') }}
                </span>
              </span>
            </th>
            <td class="team-token-metric-cell">
              <span class="team-token-metric-primary" :title="formatTokenDetail(teamTotalSummary.grossInputTokens)">{{ formatCompactInteger(teamTotalSummary.grossInputTokens) }}</span>
              <span class="team-token-metric-cost" :title="formatCost(teamTotalSummary.estimatedApiInputCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus)">
                {{ formatCost(teamTotalSummary.estimatedApiInputCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus) }}
              </span>
            </td>
            <td class="team-token-metric-cell">
              <span class="team-token-metric-primary" :title="formatTokenDetail(teamTotalSummary.outputTokens)">{{ formatCompactInteger(teamTotalSummary.outputTokens) }}</span>
              <span class="team-token-metric-cost" :title="formatCost(teamTotalSummary.estimatedApiOutputCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus)">
                {{ formatCost(teamTotalSummary.estimatedApiOutputCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus) }}
              </span>
            </td>
            <td class="team-token-metric-cell team-token-total-metric-cell">
              <span class="team-token-metric-primary team-token-total-value" :title="formatTokenDetail(teamTotalSummary.totalTokens)">{{ formatCompactInteger(teamTotalSummary.totalTokens) }}</span>
              <span class="team-token-metric-cost-line" :title="formatTotalCostTitle(teamTotalSummary.estimatedApiTotalCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus)">
                <span class="team-token-metric-cost">
                  {{ formatCost(teamTotalSummary.estimatedApiTotalCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus) }}
                </span>
                <span v-if="shouldShowMetricStatus(teamTotalSummary.apiCostStatus)" class="team-token-metric-status">
                  <span :class="compactStatusClass(teamTotalSummary.apiCostStatus)">{{ formatStatus(teamTotalSummary.apiCostStatus) }}</span>
                </span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="teamTotalLoading && !teamTotalSummary" class="mt-3 text-xs text-slate-500">
      {{ $t('shell.tokenUsage.teamTotalLoading') }}
    </p>
    <p v-else-if="teamTotalError" class="mt-3 text-xs text-amber-700">
      {{ $t('shell.tokenUsage.teamTotalUnavailable') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { createTokenUsageFormatter } from '~/components/workspace/usage/tokenUsageFormatting';
import type { TokenUsageTeamMemberRow } from '~/composables/useTokenUsageWorkspaceScope';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

defineProps<{
  rows: TokenUsageTeamMemberRow[];
  teamTotalSummary?: TokenUsageRunSummary | null;
  teamTotalLoading?: boolean;
  teamTotalError?: string | null;
}>();

const { t } = useLocalization();
const {
  formatCompactInteger,
  formatCost,
  formatStatus,
  formatTokenDetail,
} = createTokenUsageFormatter(t);

const compactStatusClass = (status: string): string => {
  const base = 'inline-flex max-w-full rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight';
  if (status === 'estimated') return `${base} text-emerald-700`;
  if (status === 'local_no_api_bill') return `${base} text-sky-700`;
  if (status === 'mixed') return `${base} text-slate-600`;
  return `${base} text-amber-700`;
};

const shouldShowMetricStatus = (status: string): boolean => status === 'partial_price_missing';

const formatTotalCostTitle = (
  value: number | null,
  currency: string | null,
  status: string,
): string => {
  const cost = formatCost(value, currency, status);
  return shouldShowMetricStatus(status) ? `${cost} · ${formatStatus(status)}` : cost;
};
</script>

<style scoped>
.team-token-table-scroll {
  margin-top: 0.75rem;
  overflow-x: auto;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  -webkit-overflow-scrolling: touch;
}

.team-token-table-scroll:focus-visible {
  outline: 2px solid rgb(59 130 246 / 0.7);
  outline-offset: 2px;
}

.team-token-table {
  min-width: 38rem;
  width: min(100%, 45rem);
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
}

.team-token-column-member {
  width: 36%;
}

.team-token-column-gross-input,
.team-token-column-output,
.team-token-column-total {
  width: 21.333%;
}

.team-token-table th,
.team-token-table td {
  padding: 0.55rem 0.5rem;
  border-top: 1px solid rgb(241 245 249);
  vertical-align: middle;
}

.team-token-table thead th {
  border-top: 0;
  background: rgb(248 250 252);
  color: rgb(100 116 139);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1rem;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.team-token-table thead th:not(:first-child),
.team-token-metric-cell {
  text-align: center;
}

.team-token-row-focused > th,
.team-token-row-focused > td {
  background: rgb(239 246 255 / 0.65);
}

.team-token-row-focused > th:first-child {
  box-shadow: inset 3px 0 0 rgb(59 130 246 / 0.65);
}

.team-token-total-row > th,
.team-token-total-row > td {
  border-top-color: rgb(226 232 240);
  background: rgb(248 250 252);
}

.team-token-member-cell {
  min-width: 0;
  color: rgb(15 23 42);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
  text-align: left;
}

.team-token-member-primary {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.team-token-member-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-token-focused-badge {
  border-radius: 9999px;
  background: rgb(219 234 254);
  padding: 0.0625rem 0.4rem;
  color: rgb(37 99 235);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.2;
}

.team-token-route {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: rgb(100 116 139);
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-token-metric-primary,
.team-token-metric-cost,
.team-token-metric-cost-line {
  color: rgb(15 23 42);
  line-height: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.team-token-metric-primary {
  display: block;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-token-total-value {
  font-weight: 700;
  color: rgb(2 6 23);
}

.team-token-metric-cost {
  display: block;
  margin-top: -0.0625rem;
  overflow: hidden;
  color: rgb(100 116 139);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-token-metric-cost-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0 0.35rem;
}

.team-token-metric-cost-line .team-token-metric-cost {
  min-width: 0;
  margin-top: 0;
}

.team-token-metric-status {
  min-width: 0;
}

.team-token-empty-cell,
.team-token-state-cell {
  color: rgb(100 116 139);
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-align: left;
}
</style>
