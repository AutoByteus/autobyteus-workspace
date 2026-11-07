<template>
  <!-- Nodes › Phone Setup (autobyteus-395): connect a phone to the window's node, one tab per way to connect. -->
  <section class="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="phones-panel">
    <div class="px-6 pb-6 pt-6">
      <div class="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div class="min-w-[16rem] max-w-xl flex-1">
          <h3 class="text-lg font-semibold leading-7 text-slate-900">{{ t('settings.components.settings.phone.panel.title') }}</h3>
          <p class="mt-0.5 text-sm leading-6 text-slate-500" data-testid="phones-subtitle">
            {{ subtitle.before }}<span class="font-medium text-slate-700">{{ store.nodeName }}</span>{{ subtitle.after }}
          </p>
        </div>
        <div class="max-w-xs flex-shrink-0 sm:text-right" data-testid="phone-access">
          <div class="flex items-center gap-3 sm:justify-end">
            <span id="phone-access-label" class="text-sm font-medium text-slate-900">{{ t('settings.components.settings.phone.access.label') }}</span>
            <span class="text-sm font-medium" :class="store.phoneAccessEnabled ? 'text-emerald-700' : 'text-slate-500'" data-testid="phone-access-state">
              {{ store.phoneAccessEnabled ? t('settings.components.settings.phone.access.on') : t('settings.components.settings.phone.access.off') }}
            </span>
            <button
              type="button"
              role="switch"
              class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-60"
              :class="store.phoneAccessEnabled ? 'bg-emerald-500' : 'bg-slate-300'"
              :aria-checked="store.phoneAccessEnabled"
              aria-labelledby="phone-access-label"
              :disabled="store.isLoading"
              data-testid="phone-access-switch"
              @click="store.setPhoneAccessEnabled(!store.phoneAccessEnabled)"
            >
              <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="store.phoneAccessEnabled ? 'translate-x-5' : 'translate-x-0.5'" />
            </button>
          </div>
          <p class="mt-1 text-xs leading-5 text-slate-500" data-testid="phone-access-line">
            {{ store.phoneAccessEnabled ? t('settings.components.settings.phone.access.onLine') : t('settings.components.settings.phone.access.offLine') }}
          </p>
        </div>
      </div>

      <p v-if="store.loadError" class="mt-4 text-sm text-red-600" role="alert" data-testid="phones-load-error">{{ store.loadError }}</p>

      <p v-if="store.isLoading" class="mt-5 text-sm text-slate-500" role="status" data-testid="phones-loading">{{ t('settings.components.settings.phone.panel.loading') }}</p>
      <template v-else>
        <p v-if="blockedMessage" class="mt-4 flex max-w-2xl items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700" role="status" data-testid="phones-blocked">
          <Icon icon="heroicons:exclamation-triangle-20-solid" class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
          {{ blockedMessage }}
        </p>

        <div class="mt-5">
          <div class="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 md:rounded-full" role="tablist" :aria-label="t('settings.components.settings.phone.tabs.aria')">
            <button
              v-for="way in CONNECTION_WAY_TABS"
              :id="`phone-tab-${way}`"
              :key="way"
              type="button"
              role="tab"
              :aria-selected="store.selectedWay === way"
              :aria-controls="`phone-panel-${way}`"
              :tabindex="store.selectedWay === way ? 0 : -1"
              class="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="store.selectedWay === way ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
              :data-testid="`phone-tab-${way}`"
              @click="store.selectWay(way)"
              @keydown="onTabKey($event, way)"
            >
              <span class="h-2 w-2 flex-shrink-0 rounded-full" :class="store.readiness[way].ready ? 'bg-emerald-500' : 'bg-slate-300'" aria-hidden="true" />
              {{ t(`settings.components.settings.phone.way.${way}`) }}
              <span v-if="store.recommendedWay === way" class="rounded-full bg-blue-50 px-2 py-0.5 text-[0.6875rem] font-semibold leading-4 text-blue-700" data-testid="phone-recommended">
                {{ t('settings.components.settings.phone.tabs.recommended') }}
              </span>
            </button>
          </div>
        </div>

        <PhoneWayTab :key="store.selectedWay" :way="store.selectedWay" />
      </template>
    </div>

    <ConnectedPhones />
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, nextTick, onBeforeUnmount, onMounted } from 'vue';
import ConnectedPhones from '~/components/settings/phone/ConnectedPhones.vue';
import PhoneWayTab from '~/components/settings/phone/PhoneWayTab.vue';
import { phoneSetupTextKey } from '~/utils/phoneAccess/phoneSetupTextKey';
import { useLocalization } from '~/composables/useLocalization';
import { usePhoneAccessStore } from '~/stores/phoneAccessStore';
import type { ConnectionWay } from '~/types/remoteAccess';
import { CONNECTION_WAY_TABS } from '~/utils/phoneAccess/phoneConnectionWays';

const { t } = useLocalization();
const store = usePhoneAccessStore();

const NAME_MARK = '⁣';
/** The subtitle around the node's name, so the name can be set in its own weight. */
const subtitle = computed(() => {
  const [before = '', after = ''] = t('settings.components.settings.phone.panel.subtitle', { name: NAME_MARK }).split(NAME_MARK);
  return { before, after };
});

const blockedMessage = computed(() => {
  if (store.blockedReason === 'docker_unpublished') {
    return t('settings.components.settings.phone.blocked.dockerUnpublished', { name: store.nodeName });
  }
  return store.blockedReason === 'no_network'
    ? t(phoneSetupTextKey(store.kind, 'blocked.noNetwork'), { name: store.nodeName })
    : null;
});

/** WAI-ARIA tabs: Left/Right/Home/End move and select. */
function onTabKey(event: KeyboardEvent, way: ConnectionWay): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const index = CONNECTION_WAY_TABS.indexOf(way);
  const count = CONNECTION_WAY_TABS.length;
  const next = event.key === 'Home' ? 0
    : event.key === 'End' ? count - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
  const nextWay = CONNECTION_WAY_TABS[next]!;
  store.selectWay(nextWay);
  void nextTick(() => document.getElementById(`phone-tab-${nextWay}`)?.focus());
}

onMounted(() => {
  void store.load();
});

// Leaving the page discards the shown code (REQ-015).
onBeforeUnmount(() => {
  void store.discardCode();
});
</script>
