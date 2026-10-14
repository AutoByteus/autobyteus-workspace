<template>
  <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-test="throughput-card" :aria-labelledby="headingId">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 :id="headingId" class="text-sm font-semibold text-slate-900">{{ t('shell.tokenUsage.throughput.title') }}</h3>
      <span class="text-xs text-slate-500">{{ t('shell.tokenUsage.throughput.exactAgent') }}</span>
    </div>
    <template v-if="state.status === 'ready'">
      <p class="mt-2 break-all text-2xl font-semibold tabular-nums text-slate-950" data-test="throughput-value">
        {{ decimal(state.tokensPerSecond) }} <span class="text-xs font-medium text-slate-500">{{ t('shell.tokenUsage.throughput.unit') }}</span>
      </p>
      <p class="mt-1 text-xs font-medium text-blue-700" data-test="throughput-qualification">{{ t('shell.tokenUsage.throughput.lastReported') }}</p>
      <p class="mt-2 break-words text-xs text-slate-700 [overflow-wrap:anywhere]" data-test="throughput-identity">
        {{ state.identity.runtimeKind }} · {{ state.identity.modelIdentifier || state.identity.modelValue }}
      </p>
      <time class="mt-1 block break-words text-xs text-slate-500" :datetime="state.observedAt" :title="state.observedAt" data-test="throughput-time">{{ timestamp(state.observedAt) }}</time>
      <p class="mt-1 text-xs tabular-nums text-slate-500" data-test="throughput-interval">
        {{ t('shell.tokenUsage.throughput.interval', { tokens: integer(state.outputTokens), seconds: decimal(state.elapsedSeconds) }) }}
      </p>
    </template>
    <template v-else>
      <p class="mt-2 text-lg font-semibold text-slate-700" data-test="throughput-state">{{ t(`shell.tokenUsage.throughput.${state.status}`) }}</p>
      <p class="mt-1 text-xs text-slate-500" data-test="throughput-reason">{{ t(`shell.tokenUsage.throughput.${state.reason}`) }}</p>
    </template>
    <details class="mt-3 text-xs text-slate-500" data-test="throughput-help">
      <summary class="w-fit cursor-pointer rounded text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">{{ t('shell.tokenUsage.throughput.helpTitle') }}</summary>
      <p class="mt-2 leading-relaxed">{{ t('shell.tokenUsage.throughput.help') }}</p>
      <p class="mt-2 leading-relaxed">{{ t('shell.tokenUsage.throughput.lifetimeHelp') }}</p>
      <p class="mt-2 leading-relaxed">{{ t('shell.tokenUsage.throughput.claudeHelp') }}</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import type { TokenUsageThroughputState } from '~/types/tokenUsageMeter';

defineProps<{ state: TokenUsageThroughputState }>();
const { t, resolvedLocale } = useLocalization();
const headingId = useId();
const decimal = (value: number): string => new Intl.NumberFormat(resolvedLocale.value, {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
}).format(value);
const integer = (value: number): string => new Intl.NumberFormat(resolvedLocale.value).format(value);
const timestamp = (value: string): string => new Intl.DateTimeFormat(resolvedLocale.value, {
  dateStyle: 'medium', timeStyle: 'medium',
}).format(new Date(value));
</script>
