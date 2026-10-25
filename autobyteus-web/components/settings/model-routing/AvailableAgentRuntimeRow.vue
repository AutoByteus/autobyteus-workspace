<template>
  <li class="px-4 py-4" :data-testid="`available-runtime-${entry.runtime}`">
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h4 class="text-base font-semibold text-gray-900">{{ entry.name }}</h4>
      <span
        v-if="external?.signIn === 'not checked'"
        class="inline-flex items-center gap-1.5 text-sm text-amber-700"
        :data-testid="`available-runtime-${entry.runtime}-signin`"
      ><span class="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>{{ t('settings.modelRouting.runtimesNow.signInNotChecked') }}</span>
    </div>

    <!-- an external runtime: its limits, then its models -->
    <div v-if="external" class="available-runtime-grid mt-3">
      <section :aria-label="t('settings.modelRouting.runtimesNow.limits.heading')" :data-testid="`available-runtime-${entry.runtime}-limits`">
        <h5 class="text-xs font-medium text-gray-400">{{ t('settings.modelRouting.runtimesNow.limits.heading') }}</h5>
        <ul v-if="Array.isArray(external.limits)" class="mt-1.5 space-y-2">
          <li v-for="(limit, index) in external.limits" :key="`${index}-${limit.name}`" class="text-sm" :data-testid="`available-runtime-${entry.runtime}-limit`">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <span class="text-gray-900">{{ limit.name }}</span>{{ ' ' }}
              <span :class="remainingClass(limit.remainingPercent)">{{ limit.remainingPercent === null
                ? t('settings.modelRouting.runtimesNow.limits.remainingNotReported')
                : t('settings.modelRouting.runtimesNow.limits.remaining', { percent: limit.remainingPercent }) }}</span>{{ ' ' }}
              <span v-if="limit.resetsAt" class="text-gray-500">· {{ t('settings.modelRouting.runtimesNow.limits.resets', { time: localTime(limit.resetsAt, locale) }) }}</span>
            </div>
            <div
              v-if="limit.remainingPercent !== null"
              class="mt-1 h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-gray-100"
              role="presentation"
            ><div class="h-full rounded-full" :class="barClass(limit.remainingPercent)" :style="{ width: `${limit.remainingPercent}%` }"></div></div>
          </li>
        </ul>
        <p v-else-if="external.limits === 'not reported'" class="mt-1.5 text-sm text-gray-500">{{ t('settings.modelRouting.runtimesNow.limits.notReported') }}</p>
        <p v-else class="mt-1.5 text-sm text-gray-500" :data-testid="`available-runtime-${entry.runtime}-limits-unknown`">{{ t('settings.modelRouting.runtimesNow.limits.unknown', { reason: unknownReason(external.limits) ?? '' }) }}</p>
        <p v-if="external.limitsNote" class="mt-2 text-sm text-gray-600" :data-testid="`available-runtime-${entry.runtime}-limits-note`">{{ external.limitsNote }}</p>
      </section>
      <section :aria-label="t('settings.modelRouting.runtimesNow.models.heading')">
        <h5 class="text-xs font-medium text-gray-400">{{ t('settings.modelRouting.runtimesNow.models.heading') }}</h5>
        <div class="mt-1.5">
          <AvailableModelList v-if="Array.isArray(external.models)" :models="external.models" :testid="`available-runtime-${entry.runtime}-models`" />
          <p v-else class="text-sm text-gray-500" :data-testid="`available-runtime-${entry.runtime}-models-unknown`">{{ t('settings.modelRouting.runtimesNow.models.unknown', { reason: unknownReason(external.models) ?? '' }) }}</p>
        </div>
      </section>
    </div>

    <!-- AutoByteus: one row per API provider with a key, or local provider with models -->
    <template v-else-if="autobyteus">
      <p v-if="!autobyteus.providers.length" class="mt-2 text-sm text-gray-500" data-testid="available-runtime-autobyteus-no-providers">{{ t('settings.modelRouting.runtimesNow.providers.none') }}</p>
      <ul v-else class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200" :aria-label="t('settings.modelRouting.runtimesNow.providers.listLabel')">
        <li
          v-for="provider in autobyteus.providers"
          :key="provider.provider"
          class="available-runtime-grid px-3 py-2.5"
          data-testid="available-runtime-autobyteus-provider"
          :data-provider="provider.provider"
        >
          <div class="text-sm">
            <p class="font-medium text-gray-900">{{ provider.provider }}</p>
            <p v-if="provider.balance" class="text-gray-600" data-testid="available-provider-balance">{{ t('settings.modelRouting.runtimesNow.providers.balance', { balance: provider.balance }) }}</p>
            <p v-if="provider.blocked" class="text-amber-700" data-testid="available-provider-blocked">{{ t('settings.modelRouting.runtimesNow.providers.blocked', { reason: provider.blocked }) }}</p>
            <p v-if="provider.limits === 'not reported'" class="text-gray-500">{{ t('settings.modelRouting.runtimesNow.limits.notReported') }}</p>
            <p v-else-if="provider.limits" class="text-gray-500" data-testid="available-provider-limits-unknown">{{ t('settings.modelRouting.runtimesNow.limits.unknown', { reason: unknownReason(provider.limits) ?? '' }) }}</p>
          </div>
          <AvailableModelList v-if="Array.isArray(provider.models)" :models="provider.models" testid="available-provider-models" />
          <p v-else class="text-sm text-gray-500" data-testid="available-provider-models-unknown">{{ t('settings.modelRouting.runtimesNow.models.unknown', { reason: unknownReason(provider.models) ?? '' }) }}</p>
        </li>
      </ul>
    </template>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AutoByteusEntry, AvailableAgentRuntimeEntry, ExternalAgentRuntimeEntry } from '~/types/availableAgentRuntimes'
import AvailableModelList from './AvailableModelList.vue'
import { isAutoByteusEntry, localTime, unknownReason } from './availableAgentRuntimesPresentation'

const props = defineProps<{ entry: AvailableAgentRuntimeEntry }>()
const { t, resolvedLocale } = useLocalization()
const locale = computed(() => String(resolvedLocale.value || 'en'))
const external = computed<ExternalAgentRuntimeEntry | null>(() => (isAutoByteusEntry(props.entry) ? null : props.entry))
const autobyteus = computed<AutoByteusEntry | null>(() => (isAutoByteusEntry(props.entry) ? props.entry : null))

const remainingClass = (percent: number | null) =>
  percent === null ? 'text-gray-500' : percent <= 0 ? 'font-medium text-red-700' : percent < 20 ? 'text-amber-700' : 'text-gray-700'
const barClass = (percent: number) => (percent <= 0 ? 'bg-red-500' : percent < 20 ? 'bg-amber-500' : 'bg-green-600')
</script>

<style scoped>
/* Limits beside models once the list (the `available-runtimes` container) is wide enough. */
.available-runtime-grid { display: grid; grid-template-columns: minmax(0, 1fr); row-gap: 0.75rem; }

@container available-runtimes (min-width: 42rem) {
  .available-runtime-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 1.5rem; }
}
</style>
