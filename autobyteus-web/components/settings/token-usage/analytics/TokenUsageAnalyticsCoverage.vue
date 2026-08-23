<template>
  <div class="space-y-2" aria-live="polite">
    <div class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm" :class="coverageClass">
      <span class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" :class="dotClass"></span>
      <div>
        <p class="font-semibold">{{ coverageTitle }}</p>
        <p class="mt-0.5 opacity-80">{{ coverageDetail }}</p>
      </div>
    </div>
    <div v-if="pricingNotice" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p class="font-semibold">{{ pricingNotice }}</p>
      <p class="mt-0.5">{{ t('settings.components.settings.TokenUsageAnalytics.notInvoice') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';

const props = defineProps<{ result: TokenUsageAnalyticsResult }>();
const { t } = useLocalization();
const coverageDate = computed(() => new Date(props.result.coverage.coverageStart)
  .toISOString()
  .replace('T', ' ')
  .replace(/:\d{2}\.\d{3}Z$/, ' UTC'));
const coverageTitle = computed(() => props.result.coverage.status === 'FULL'
  ? t('settings.components.settings.TokenUsageAnalytics.fullCoverage')
  : props.result.coverage.status === 'PARTIAL'
    ? t('settings.components.settings.TokenUsageAnalytics.partialCoverage')
    : t('settings.components.settings.TokenUsageAnalytics.unavailableCoverage'));
const coverageDetail = computed(() => props.result.coverage.status === 'UNAVAILABLE'
  ? t('settings.components.settings.TokenUsageAnalytics.unavailableDetail', { date: coverageDate.value })
  : t('settings.components.settings.TokenUsageAnalytics.trackingSince', { date: coverageDate.value }));
const coverageClass = computed(() => props.result.coverage.status === 'FULL'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
  : 'border-amber-200 bg-amber-50 text-amber-900');
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
