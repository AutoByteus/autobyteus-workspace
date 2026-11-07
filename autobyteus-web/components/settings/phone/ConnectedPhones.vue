<template>
  <!-- Connected phones (REQ-014): active phones in view, Revoke per phone, a quiet Revoke all, revoked phones in History. -->
  <div class="border-t border-slate-100 px-6 py-5" data-testid="connected-phones">
    <div class="flex items-center justify-between gap-3">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('settings.components.settings.phone.phones.title') }}</h4>
      <button
        v-if="store.activeDevices.length > 0 && !confirmingRevokeAll"
        type="button"
        class="rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        data-testid="phones-revoke-all"
        @click="confirmingRevokeAll = true"
      >
        {{ t('settings.components.settings.phone.phones.revokeAll') }}
      </button>
    </div>

    <div v-if="confirmingRevokeAll" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alertdialog" :aria-label="t('settings.components.settings.phone.phones.revokeAllAria')" data-testid="phones-revoke-all-confirm">
      <p class="text-sm text-red-900">{{ t('settings.components.settings.phone.phones.revokeAllConfirm', { count: store.activeDevices.length }) }}</p>
      <div class="flex items-center gap-2">
        <button type="button" class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1" data-testid="phones-revoke-all-yes" @click="revokeAll">
          {{ t('settings.components.settings.phone.phones.revokeAll') }}
        </button>
        <button type="button" class="rounded-lg px-3 py-2 text-sm font-semibold text-red-900 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400" data-testid="phones-revoke-all-cancel" @click="confirmingRevokeAll = false">
          {{ t('settings.components.settings.phone.phones.cancel') }}
        </button>
      </div>
    </div>

    <p v-if="store.activeDevices.length === 0 && !confirmingRevokeAll" class="mt-2 text-sm text-slate-500" data-testid="phones-empty">{{ t('settings.components.settings.phone.phones.empty') }}</p>
    <ul v-else-if="store.activeDevices.length > 0" class="mt-2 divide-y divide-slate-100" data-testid="phones-active-list">
      <li v-for="device in store.activeDevices" :key="device.deviceId" class="flex items-center gap-3 py-3" data-testid="phones-active-row">
        <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon icon="heroicons:device-phone-mobile-20-solid" class="h-5 w-5" aria-hidden="true" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-slate-900">{{ device.displayName }}</span>
          <span class="block truncate text-xs text-slate-500">{{ activeDetail(device) }}</span>
        </span>
        <button
          type="button"
          class="flex-shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          :aria-label="t('settings.components.settings.phone.phones.revokeAria', { name: device.displayName })"
          data-testid="phones-revoke"
          @click="store.revokeDevice(device.deviceId)"
        >
          {{ t('settings.components.settings.phone.phones.revoke') }}
        </button>
      </li>
    </ul>

    <div v-if="store.revokedDevices.length > 0" class="mt-2 border-t border-slate-100 pt-2" data-testid="phones-history">
      <button type="button" class="flex w-full items-center gap-1.5 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-expanded="historyOpen" aria-controls="phones-history-list" data-testid="phones-history-toggle" @click="historyOpen = !historyOpen">
        <Icon icon="heroicons:chevron-right-20-solid" class="h-4 w-4 text-slate-400 transition-transform" :class="historyOpen ? 'rotate-90' : ''" aria-hidden="true" />
        {{ t('settings.components.settings.phone.phones.history', { count: store.revokedDevices.length }) }}
      </button>
      <ul v-if="historyOpen" id="phones-history-list" class="mt-1 max-h-72 divide-y divide-slate-100 overflow-y-auto" data-testid="phones-history-list">
        <li v-for="device in store.revokedDevices" :key="device.deviceId" class="flex items-center gap-3 py-2.5 pl-1" data-testid="phones-history-row">
          <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
            <Icon icon="heroicons:device-phone-mobile-20-solid" class="h-4 w-4" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-slate-700">{{ device.displayName }}</span>
            <span class="block truncate text-xs text-slate-500">{{ revokedDetail(device) }}</span>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { usePhoneAccessStore } from '~/stores/phoneAccessStore';
import type { PairedDeviceSummary } from '~/types/remoteAccess';

const { t, resolvedLocale } = useLocalization();
const store = usePhoneAccessStore();

const confirmingRevokeAll = ref(false);
const historyOpen = ref(false);

const wayLabel = (device: PairedDeviceSummary): string | null =>
  device.connectionWay ? t(`settings.components.settings.phone.phones.via.${device.connectionWay}`) : null;

/** Dates follow the app's language, not the computer's, so they read as part of the app's sentences. */
const locale = (): string => String(resolvedLocale.value || 'en');

/** "2 minutes ago", "yesterday": the largest whole unit. */
const relativeTime = (iso: string): string => {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]];
  const format = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, 'second');
};

const activeDetail = (device: PairedDeviceSummary): string => {
  const lastSeen = device.lastSeenAt
    ? t('settings.components.settings.phone.phones.lastSeen', { when: relativeTime(device.lastSeenAt) })
    : t('settings.components.settings.phone.phones.notSeenYet');
  const way = wayLabel(device);
  return way ? `${t('settings.components.settings.phone.phones.connectsThrough', { way })} · ${lastSeen}` : lastSeen;
};

const revokedDetail = (device: PairedDeviceSummary): string => {
  const revoked = t('settings.components.settings.phone.phones.revokedOn', {
    date: device.revokedAt ? new Date(device.revokedAt).toLocaleDateString(locale(), { month: 'short', day: 'numeric' }) : '',
  });
  const way = wayLabel(device);
  return way ? `${revoked} · ${t('settings.components.settings.phone.phones.connectedThrough', { way })}` : revoked;
};

async function revokeAll(): Promise<void> {
  confirmingRevokeAll.value = false;
  await store.revokeAllDevices();
}
</script>
