<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="phone-access-card">
    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">{{ $t('settings.components.settings.PhoneAccessCard.title') }}</h3>
        <p class="mt-1 text-xs text-gray-500">
          {{ $t('settings.components.settings.PhoneAccessCard.description') }}
        </p>
      </div>
      <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          class="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
          :checked="store.phoneAccessEnabled"
          :disabled="store.isLoading || !store.canManagePhoneAccess"
          data-testid="phone-access-toggle"
          @change="onToggle(($event.target as HTMLInputElement).checked)"
        />
        {{ $t('settings.components.settings.PhoneAccessCard.enable') }}
      </label>
    </div>

    <div v-if="store.isLoading" class="mt-4 text-sm text-slate-500">{{ $t('settings.components.settings.PhoneAccessCard.loading') }}</div>
    <p v-if="store.error" class="mt-3 text-sm text-red-600" data-testid="phone-access-error">{{ store.error }}</p>
    <p v-if="store.info" class="mt-3 text-sm text-blue-700" data-testid="phone-access-info">{{ store.info }}</p>

    <div v-if="!store.phoneAccessEnabled" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {{ $t('settings.components.settings.PhoneAccessCard.disabledNotice') }}
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-4">
        <div class="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <label class="text-xs font-semibold uppercase tracking-wide text-blue-800">{{ $t('settings.components.settings.PhoneAccessCard.manualPrivateNetworkUrl') }}</label>
          <p class="mt-1 text-xs leading-5 text-blue-900" data-testid="phone-access-manual-url-help">
            {{ $t('settings.components.settings.PhoneAccessCard.serveHttpsUrlHelp') }}
          </p>
          <div class="mt-2 flex gap-2">
            <input
              v-model="store.manualServerBaseUrl"
              type="text"
              placeholder="https://desktop.tailnet-name.ts.net/mobile or http://192.168.1.25:29695/mobile"
              class="min-w-0 flex-1 rounded-lg border border-blue-200 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              data-testid="phone-access-manual-url"
              @input="onAdvertisedUrlInput(($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              data-testid="phone-access-use-manual-url"
              @click="store.refreshCandidates"
            >
              {{ $t('settings.components.settings.PhoneAccessCard.useManualUrl') }}
            </button>
          </div>
          <p class="mt-2 text-xs text-blue-900" data-testid="phone-access-normalized-url-note">
            {{ $t('settings.components.settings.PhoneAccessCard.baseMobileContract') }}
          </p>
          <div
            v-if="selectedUrlWarning"
            class="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            data-testid="phone-access-url-warning"
          >
            <p class="font-semibold">{{ selectedUrlWarningTitle }}</p>
            <p class="mt-1">{{ selectedUrlWarning }}</p>
          </div>
          <label
            v-if="store.selectedUrlRequiresTrustedPrivateHttpAcknowledgement"
            class="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-white p-3 text-xs text-amber-900"
            data-testid="phone-access-private-http-ack"
          >
            <input
              v-model="store.trustedPrivateHttpAcknowledged"
              type="checkbox"
              class="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-200"
              data-testid="phone-access-private-http-ack-checkbox"
            />
            <span>{{ $t('settings.components.settings.PhoneAccessCard.privateHttpAcknowledgement') }}</span>
          </label>
        </div>

        <div>
          <div class="flex items-center justify-between gap-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">{{ $t('settings.components.settings.PhoneAccessCard.reachableServerUrl') }}</label>
            <button type="button" class="text-xs font-medium text-blue-700 hover:text-blue-900" @click="store.refreshCandidates">
              {{ $t('settings.components.settings.PhoneAccessCard.refreshCandidates') }}
            </button>
          </div>
          <select
            v-model="store.selectedServerBaseUrl"
            class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            data-testid="phone-access-candidate-select"
          >
            <option value="">{{ $t('settings.components.settings.PhoneAccessCard.candidatePlaceholder') }}</option>
            <option v-for="candidate in store.candidates" :key="candidate.id" :value="candidate.serverBaseUrl">
              {{ candidate.label }} — {{ candidate.serverBaseUrl }}
            </option>
          </select>
          <p class="mt-2 text-xs text-slate-500" data-testid="phone-access-candidate-note">
            {{ store.isRemoteNodeWindow ? $t('settings.components.settings.PhoneAccessCard.remoteCandidateDiagnosticNote') : $t('settings.components.settings.PhoneAccessCard.httpCandidateDiagnosticNote') }}
          </p>
        </div>

        <div
          v-if="store.isRemoteNodeWindow"
          class="rounded-lg border p-3 text-xs"
          :class="store.advertisedUrlVerified ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'"
          data-testid="phone-access-advertised-url-verification"
        >
          {{ store.advertisedUrlVerificationMessage || $t('settings.components.settings.PhoneAccessCard.remoteAdvertisedUrlVerificationHelp') }}
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            :disabled="!canCreatePairingSession"
            data-testid="phone-access-create-qr"
            @click="onCreateQr"
          >
            {{ $t('settings.components.settings.PhoneAccessCard.createQrCode') }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            :disabled="store.activeDevices.length === 0"
            data-testid="phone-access-revoke-all"
            @click="onRevokeAll"
          >
            {{ $t('settings.components.settings.PhoneAccessCard.revokeAllPhones') }}
          </button>
        </div>

        <div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-600">{{ $t('settings.components.settings.PhoneAccessCard.pairedPhones') }}</h4>
            <div class="inline-flex w-fit rounded-full border border-slate-200 bg-slate-100 p-1" role="tablist" :aria-label="$t('settings.components.settings.PhoneAccessCard.deviceViewsAria')">
              <button
                type="button"
                role="tab"
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                :class="deviceListView === 'active' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                :aria-selected="deviceListView === 'active'"
                data-testid="phone-access-devices-tab-active"
                @click="deviceListView = 'active'"
              >
                {{ $t('settings.components.settings.PhoneAccessCard.activeDevicesTab', { count: store.activeDevices.length }) }}
              </button>
              <button
                type="button"
                role="tab"
                class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                :class="deviceListView === 'revoked' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                :aria-selected="deviceListView === 'revoked'"
                data-testid="phone-access-devices-tab-revoked"
                @click="deviceListView = 'revoked'"
              >
                {{ $t('settings.components.settings.PhoneAccessCard.revokedDevicesTab', { count: store.revokedDevices.length }) }}
              </button>
            </div>
          </div>

          <div v-if="visibleDevices.length === 0" class="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500" data-testid="phone-access-devices-empty">
            {{ deviceListView === 'active' ? $t('settings.components.settings.PhoneAccessCard.noActivePhonesPaired') : $t('settings.components.settings.PhoneAccessCard.noRevokedPhones') }}
          </div>
          <div v-else class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200" data-testid="phone-access-devices-list">
            <div v-for="device in visibleDevices" :key="device.deviceId" class="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between" :data-testid="`phone-access-device-${device.deviceId}`">
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-900">{{ device.displayName }}</p>
                <p class="break-all font-mono text-xs text-slate-500">{{ device.clientFacingBaseUrl }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ $t('settings.components.settings.PhoneAccessCard.pairedAt', { date: formatDate(device.createdAt) }) }} ·
                  {{ $t('settings.components.settings.PhoneAccessCard.lastSeenAt', { date: device.lastSeenAt ? formatDate(device.lastSeenAt) : $t('settings.components.settings.PhoneAccessCard.neverSeen') }) }}
                  <span v-if="deviceListView === 'revoked' && device.revokedAt" class="text-red-600">
                    · {{ $t('settings.components.settings.PhoneAccessCard.revokedAt', { date: formatDate(device.revokedAt) }) }}
                  </span>
                </p>
              </div>
              <button
                v-if="deviceListView === 'active'"
                type="button"
                class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                data-testid="phone-access-revoke-device"
                @click="store.revokeDevice(device.deviceId)"
              >
                {{ $t('settings.components.settings.PhoneAccessCard.revokePhone') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 class="text-sm font-semibold text-slate-900">{{ $t('settings.components.settings.PhoneAccessCard.pairingQr') }}</h4>
        <p class="mt-1 text-xs text-slate-500">{{ $t('settings.components.settings.PhoneAccessCard.pairingQrDescription') }}</p>
        <div v-if="qrDataUrl" class="mt-3 flex justify-center rounded-lg bg-white p-3">
          <img :src="qrDataUrl" :alt="$t('settings.components.settings.PhoneAccessCard.pairingQrAlt')" class="h-56 w-56" data-testid="phone-access-qr-image" />
        </div>
        <div v-else class="mt-3 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {{ $t('settings.components.settings.PhoneAccessCard.noActiveQrCode') }}
        </div>
        <textarea
          v-if="store.activePairing"
          class="mt-3 h-24 w-full rounded-lg border border-slate-300 bg-white p-2 font-mono text-xs text-slate-700"
          readonly
          :value="store.activePairing.qrText"
          data-testid="phone-access-qr-text"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePhoneAccessStore } from '~/stores/phoneAccessStore';
import { toQrCodeDataUrl } from '~/services/qr/qrCodeDataUrlService';

const store = usePhoneAccessStore();
const { t: $t } = useLocalization();
const qrDataUrl = ref<string | null>(null);
const deviceListView = ref<'active' | 'revoked'>('active');

const selectedUrlWarning = computed(() => (
  store.selectedServerBaseUrl.trim()
    ? store.selectedUrlWarning
    : null
));

const selectedUrlWarningTitle = computed(() => (
  store.selectedUrlRequiresTrustedPrivateHttpAcknowledgement
    ? $t('settings.components.settings.PhoneAccessCard.privateHttpWarningTitle')
    : $t('settings.components.settings.PhoneAccessCard.urlNeedsAttentionTitle')
));

const canCreatePairingSession = computed(() => store.canCreatePairingSession);

const visibleDevices = computed(() => (
  deviceListView.value === 'active' ? store.activeDevices : store.revokedDevices
));

const formatDate = (value: string): string => new Date(value).toLocaleString();

async function renderQr(): Promise<void> {
  qrDataUrl.value = store.activePairing?.qrText
    ? await toQrCodeDataUrl(store.activePairing.qrText)
    : null;
}

async function onToggle(enabled: boolean): Promise<void> {
  await store.setEnabled(enabled);
}

function onAdvertisedUrlInput(value: string): void {
  store.selectedServerBaseUrl = value;
}

async function onCreateQr(): Promise<void> {
  await store.createPairingSession();
  await renderQr();
}

async function onRevokeAll(): Promise<void> {
  const confirmed = window.confirm($t('settings.components.settings.PhoneAccessCard.revokeAllConfirm'));
  if (!confirmed) {
    return;
  }
  const count = await store.revokeAllDevices();
  window.alert($t('settings.components.settings.PhoneAccessCard.revokedCredentials', { count }));
}

watch(() => store.activePairing?.qrText, renderQr);

onMounted(async () => {
  await store.loadAll();
  await renderQr();
});
</script>
