<template>
  <div class="flex flex-wrap items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-sm" :class="coverageBorder" aria-live="polite">
    <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" :class="dotClass" aria-hidden="true"></span>
    <div class="min-w-0 flex-1">
      <p class="font-semibold text-slate-900">{{ coverageTitle }}</p>
      <p class="mt-0.5 text-slate-600">{{ coverageDetail }}</p>
    </div>
    <p v-if="pricingNotice" class="w-full border-t border-amber-100 pt-2 text-amber-900 sm:ml-5">
      <span class="font-semibold">{{ pricingNotice }}</span> {{ t('settings.components.settings.TokenUsageAnalytics.notInvoice') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';

const props = defineProps<{ result: TokenUsageAnalyticsResult }>();
const { t, resolvedLocale } = useLocalization();
const coverageDate = computed(() => `${new Intl.DateTimeFormat(resolvedLocale.value, {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC',
}).format(new Date(props.result.coverage.coverageStart))} UTC`);
const coverageTitle = computed(() => props.result.coverage.status === 'FULL'
  ? t('settings.components.settings.TokenUsageAnalytics.fullCoverageShort')
  : props.result.coverage.status === 'PARTIAL'
    ? t('settings.components.settings.TokenUsageAnalytics.partialCoverage')
    : t('settings.components.settings.TokenUsageAnalytics.unavailableCoverage'));
const coverageDetail = computed(() => props.result.coverage.status === 'UNAVAILABLE'
  ? t('settings.components.settings.TokenUsageAnalytics.unavailableDetail', { date: coverageDate.value })
  : t('settings.components.settings.TokenUsageAnalytics.trackingSince', { date: coverageDate.value }));
const coverageBorder = computed(() => props.result.coverage.status === 'FULL' ? 'border-emerald-200' : 'border-amber-200');
const dotClass = computed(() => props.result.coverage.status === 'FULL' ? 'bg-emerald-500' : 'bg-amber-500');
const pricingNotice = computed(() => {
  const kind = props.result.selectedCostQuality.kind;
  if (kind === 'MIXED_CURRENCY') return t('settings.components.settings.TokenUsageAnalytics.mixedCurrencies');
  if (kind === 'PARTIAL') return t('settings.components.settings.TokenUsageAnalytics.partialPricing');
  if (kind === 'MISSING') return t('settings.components.settings.TokenUsageAnalytics.missingPricing');
  if (kind === 'LOCAL') return t('settings.components.settings.TokenUsageAnalytics.localUsage');
  return null;
});
</script>
