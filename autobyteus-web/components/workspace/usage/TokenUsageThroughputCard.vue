<template>
  <section class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-test="throughput-card" :aria-labelledby="headingId">
    <h3 :id="headingId" class="text-sm font-semibold text-slate-900">{{ t('shell.tokenUsage.throughput.title') }}</h3>
    <template v-if="tps">
      <p class="mt-2 break-all text-2xl font-semibold tabular-nums text-slate-950" data-test="throughput-value">
        {{ decimal(tokensPerSecond(tps), 1) }} <span class="text-xs font-medium text-slate-500">{{ t('shell.tokenUsage.throughput.unit') }}</span>
      </p>
      <p v-if="tps.model || tps.method === 'end_to_end'" class="mt-1 break-words text-xs text-slate-500 [overflow-wrap:anywhere]" data-test="throughput-model">
        <span v-if="tps.model">{{ tps.model }}</span>
        <span v-if="tps.model && tps.method === 'end_to_end'"> · </span>
        <span v-if="tps.method === 'end_to_end'" data-test="throughput-end-to-end">{{ t('shell.tokenUsage.throughput.endToEndQualifier') }}</span>
      </p>
    </template>
    <p v-else class="mt-2 text-2xl font-semibold text-slate-400" data-test="throughput-empty">—</p>
    <details class="mt-3 text-xs text-slate-500" data-test="throughput-help">
      <summary class="w-fit cursor-pointer rounded text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">{{ t('shell.tokenUsage.throughput.helpTitle') }}</summary>
      <p v-if="tps" class="mt-2 leading-relaxed" data-test="throughput-method-help">
        {{ t(tps.method === 'generation' ? 'shell.tokenUsage.throughput.generationHelp' : 'shell.tokenUsage.throughput.endToEndHelp', {
          tokens: integer(tps.outputTokens), seconds: decimal(tps.durationMs / 1000, 2),
        }) }}
      </p>
      <p class="mt-2 leading-relaxed">{{ t('shell.tokenUsage.throughput.generalHelp') }}</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import type { TokenUsageTps } from '~/types/tokenUsageMeter';

defineProps<{ tps: TokenUsageTps | null }>();
const { t, resolvedLocale } = useLocalization();
const headingId = useId();
const tokensPerSecond = (tps: TokenUsageTps): number => tps.outputTokens / (tps.durationMs / 1000);
const decimal = (value: number, maximumFractionDigits: number): string => new Intl.NumberFormat(resolvedLocale.value, {
  minimumFractionDigits: 1, maximumFractionDigits,
}).format(value);
const integer = (value: number): string => new Intl.NumberFormat(resolvedLocale.value).format(value);
</script>
