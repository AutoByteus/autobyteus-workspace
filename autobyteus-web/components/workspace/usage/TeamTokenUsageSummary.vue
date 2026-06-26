<template>
  <section class="team-token-usage-summary rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-test="team-token-usage-summary">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ $t('shell.tokenUsage.teamHeading') }}</h3>
        <p class="mt-1 text-xs text-slate-500">{{ $t('shell.tokenUsage.teamSubtitle') }}</p>
      </div>
    </div>

    <div class="team-token-list">
      <div class="team-token-header">
        <span>{{ $t('shell.tokenUsage.teamMember') }}</span>
        <span>{{ $t('shell.tokenUsage.grossInput') }}</span>
        <span>{{ $t('shell.tokenUsage.output') }}</span>
        <span>{{ $t('shell.tokenUsage.totalTokens') }}</span>
        <span>{{ $t('shell.tokenUsage.costLabel') }}</span>
      </div>

      <div v-if="rows.length === 0" class="px-3 py-3 text-sm text-slate-500">
        {{ $t('shell.tokenUsage.teamNoMembers') }}
      </div>

      <article
        v-for="row in rows"
        :key="row.memberRouteKey"
        class="team-token-row"
        :class="{ 'team-token-row-focused': row.isFocused }"
        data-test="team-token-row"
        :data-focused="row.isFocused ? 'true' : 'false'"
        :data-member-route-key="row.memberRouteKey"
      >
        <div class="team-token-member-cell">
          <div class="team-token-member-primary">
            <p class="min-w-0 truncate font-semibold text-slate-900" :title="row.displayName">
              {{ row.displayName }}
            </p>
            <span v-if="row.isFocused" class="team-token-focused-badge">
              {{ $t('shell.tokenUsage.focusedBadge') }}
            </span>
          </div>
          <p v-if="row.memberRouteKey !== row.displayName" class="team-token-route" :title="row.memberRouteKey">{{ row.memberRouteKey }}</p>
        </div>

        <template v-if="row.summary">
          <div class="team-token-metric">
            <p class="team-token-metric-label">{{ $t('shell.tokenUsage.grossInput') }}</p>
            <p class="team-token-metric-value" :title="formatTokenDetail(row.summary.grossInputTokens)">{{ formatCompactInteger(row.summary.grossInputTokens) }}</p>
          </div>
          <div class="team-token-metric">
            <p class="team-token-metric-label">{{ $t('shell.tokenUsage.output') }}</p>
            <p class="team-token-metric-value" :title="formatTokenDetail(row.summary.outputTokens)">{{ formatCompactInteger(row.summary.outputTokens) }}</p>
          </div>
          <div class="team-token-metric">
            <p class="team-token-metric-label">{{ $t('shell.tokenUsage.totalTokens') }}</p>
            <p class="team-token-metric-value font-semibold text-slate-950" :title="formatTokenDetail(row.summary.totalTokens)">{{ formatCompactInteger(row.summary.totalTokens) }}</p>
          </div>
          <div class="team-token-metric team-token-cost-cell">
            <p class="team-token-metric-label">{{ $t('shell.tokenUsage.costLabel') }}</p>
            <p class="team-token-cost-value" :title="`${formatCost(row.summary.estimatedApiTotalCost, row.summary.currency, row.summary.apiCostStatus)} · ${formatStatus(row.summary.apiCostStatus)}`">
              <span class="team-token-cost-main">
                <span>{{ formatCost(row.summary.estimatedApiTotalCost, row.summary.currency, row.summary.apiCostStatus) }}</span>
                <span :class="compactStatusClass(row.summary.apiCostStatus)">{{ formatStatus(row.summary.apiCostStatus) }}</span>
              </span>
              <span class="team-token-cost-split">
                {{ $t('shell.tokenUsage.inputCostShort') }} {{ formatCost(row.summary.estimatedApiInputCost, row.summary.currency, row.summary.apiCostStatus) }}
                <span class="text-slate-300">·</span>
                {{ $t('shell.tokenUsage.outputCostShort') }} {{ formatCost(row.summary.estimatedApiOutputCost, row.summary.currency, row.summary.apiCostStatus) }}
              </span>
            </p>
          </div>
        </template>

        <template v-else>
          <div class="team-token-empty-cell">
            <p class="text-sm text-slate-500">
              <span v-if="row.loading">{{ $t('shell.tokenUsage.teamLoading') }}</span>
              <span v-else-if="row.error">{{ $t('shell.tokenUsage.teamUnavailable') }}</span>
              <span v-else>{{ $t('shell.tokenUsage.teamNoUsage') }}</span>
            </p>
          </div>
        </template>
      </article>

      <article
        v-if="teamTotalSummary"
        class="team-token-row team-token-total-row"
        data-test="team-token-total-row"
      >
        <div class="team-token-member-cell">
          <div class="team-token-member-primary">
            <p class="min-w-0 truncate font-semibold text-slate-900">
              {{ $t('shell.tokenUsage.teamTotal') }}
            </p>
          </div>
        </div>
        <div class="team-token-metric">
          <p class="team-token-metric-label">{{ $t('shell.tokenUsage.grossInput') }}</p>
          <p class="team-token-metric-value" :title="formatTokenDetail(teamTotalSummary.grossInputTokens)">{{ formatCompactInteger(teamTotalSummary.grossInputTokens) }}</p>
        </div>
        <div class="team-token-metric">
          <p class="team-token-metric-label">{{ $t('shell.tokenUsage.output') }}</p>
          <p class="team-token-metric-value" :title="formatTokenDetail(teamTotalSummary.outputTokens)">{{ formatCompactInteger(teamTotalSummary.outputTokens) }}</p>
        </div>
        <div class="team-token-metric">
          <p class="team-token-metric-label">{{ $t('shell.tokenUsage.totalTokens') }}</p>
          <p class="team-token-metric-value font-semibold text-slate-950" :title="formatTokenDetail(teamTotalSummary.totalTokens)">{{ formatCompactInteger(teamTotalSummary.totalTokens) }}</p>
        </div>
        <div class="team-token-metric team-token-cost-cell">
          <p class="team-token-metric-label">{{ $t('shell.tokenUsage.costLabel') }}</p>
          <p class="team-token-cost-value" :title="`${formatCost(teamTotalSummary.estimatedApiTotalCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus)} · ${formatStatus(teamTotalSummary.apiCostStatus)}`">
            <span class="team-token-cost-main">
              <span>{{ formatCost(teamTotalSummary.estimatedApiTotalCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus) }}</span>
              <span :class="compactStatusClass(teamTotalSummary.apiCostStatus)">{{ formatStatus(teamTotalSummary.apiCostStatus) }}</span>
            </span>
            <span class="team-token-cost-split">
              {{ $t('shell.tokenUsage.inputCostShort') }} {{ formatCost(teamTotalSummary.estimatedApiInputCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus) }}
              <span class="text-slate-300">·</span>
              {{ $t('shell.tokenUsage.outputCostShort') }} {{ formatCost(teamTotalSummary.estimatedApiOutputCost, teamTotalSummary.currency, teamTotalSummary.apiCostStatus) }}
            </span>
          </p>
        </div>
      </article>
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
  const base = 'inline-flex max-w-full text-[10px] font-semibold leading-tight';
  if (status === 'estimated') return `${base} text-emerald-700`;
  if (status === 'local_no_api_bill') return `${base} text-sky-700`;
  if (status === 'mixed') return `${base} text-slate-600`;
  return `${base} text-amber-700`;
};
</script>

<style scoped>
.team-token-usage-summary {
  container-type: inline-size;
}

.team-token-list {
  margin-top: 0.75rem;
  --team-token-wide-columns: minmax(10rem, 1.35fr) minmax(6rem, 0.75fr) minmax(4.5rem, 0.55fr) minmax(6.5rem, 0.8fr) minmax(12.5rem, 1.15fr);
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
}

.team-token-header {
  display: none;
}

.team-token-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.25rem 0.65rem;
  padding: 0.45rem 0.65rem;
  border-top: 1px solid rgb(241 245 249);
  background: white;
}

.team-token-header + .team-token-row {
  border-top: 0;
}

.team-token-row:first-of-type {
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
}

.team-token-row:last-child {
  border-bottom-left-radius: 0.75rem;
  border-bottom-right-radius: 0.75rem;
}

.team-token-row-focused {
  background: rgb(239 246 255 / 0.65);
  box-shadow: inset 3px 0 0 rgb(59 130 246 / 0.65);
}

.team-token-total-row {
  background: rgb(248 250 252);
  border-top-color: rgb(226 232 240);
}

.team-token-member-cell,
.team-token-empty-cell {
  grid-column: 1 / -1;
}

.team-token-member-cell {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.15rem 0.75rem;
  font-size: 0.875rem;
}

.team-token-member-primary {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.team-token-member-primary > p {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.team-token-focused-badge {
  border-radius: 9999px;
  background: rgb(219 234 254);
  padding: 0.0625rem 0.4rem;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(37 99 235);
}

.team-token-route {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(100 116 139);
  font-size: 0.6875rem;
}

.team-token-metric {
  display: block;
  min-width: 0;
}

.team-token-cost-cell {
  grid-column: 1 / -1;
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 0.5rem;
}

.team-token-metric-label {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(100 116 139);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1.25rem;
  text-transform: uppercase;
}

.team-token-metric-value,
.team-token-cost-value {
  margin-top: 0.0625rem;
  min-width: 0;
  color: rgb(15 23 42);
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.team-token-metric-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-token-cost-value {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.45rem;
  font-weight: 700;
}

.team-token-cost-main {
  display: flex;
  max-width: 100%;
  min-width: 0;
  align-items: baseline;
  gap: 0.25rem;
}

.team-token-cost-main > span:first-child {
  min-width: 0;
  white-space: nowrap;
}

.team-token-cost-split {
  display: inline;
  margin-top: 0;
  color: rgb(100 116 139);
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 1rem;
  white-space: normal;
}

.team-token-empty-cell {
  padding-top: 0.25rem;
  border-top: 1px solid rgb(241 245 249);
}

@container (min-width: 34rem) {
  .team-token-metric:not(.team-token-cost-cell) {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
  }

  .team-token-metric:not(.team-token-cost-cell) .team-token-metric-value {
    margin-top: 0;
    flex: 1;
  }
}

@container (min-width: 46rem) {
  .team-token-header {
    display: grid;
    grid-template-columns: var(--team-token-wide-columns);
    gap: 0.75rem;
    padding: 0.45rem 0.75rem;
    border-top-left-radius: 0.75rem;
    border-top-right-radius: 0.75rem;
    background: rgb(248 250 252);
    color: rgb(100 116 139);
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .team-token-header span:not(:first-child) {
    text-align: right;
  }

  .team-token-row {
    grid-template-columns: var(--team-token-wide-columns);
    align-items: center;
    gap: 0.75rem;
    padding-block: 0.5rem;
  }

  .team-token-row:first-of-type {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .team-token-member-cell,
  .team-token-empty-cell {
    grid-column: auto;
  }

  .team-token-cost-cell {
    grid-column: auto;
    display: block;
  }

  .team-token-empty-cell {
    grid-column: span 4;
  }

  .team-token-metric {
    display: block;
    text-align: right;
  }

  .team-token-metric-value,
  .team-token-cost-value {
    margin-top: 0.0625rem;
  }

  .team-token-metric-label {
    display: none;
  }

  .team-token-cost-value {
    display: block;
    text-align: right;
  }

  .team-token-cost-main {
    justify-content: flex-end;
  }

  .team-token-cost-split {
    display: block;
    margin-top: -0.0625rem;
    text-align: right;
    white-space: nowrap;
  }
}
</style>
