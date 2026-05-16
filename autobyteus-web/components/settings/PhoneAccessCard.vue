<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="phone-access-card">
    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">Phone Access</h3>
        <p class="mt-1 text-xs text-gray-500">
          Pair a phone/PWA to this desktop over any private network you already trust.
        </p>
      </div>
      <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          class="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
          :checked="store.phoneAccessEnabled"
          :disabled="store.isLoading"
          data-testid="phone-access-toggle"
          @change="onToggle(($event.target as HTMLInputElement).checked)"
        />
        Enable Phone Access
      </label>
    </div>

    <div v-if="store.isLoading" class="mt-4 text-sm text-slate-500">Loading Phone Access…</div>
    <p v-if="store.error" class="mt-3 text-sm text-red-600" data-testid="phone-access-error">{{ store.error }}</p>
    <p v-if="store.info" class="mt-3 text-sm text-blue-700" data-testid="phone-access-info">{{ store.info }}</p>

    <div v-if="!store.phoneAccessEnabled" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      Phones cannot connect while Phone Access is disabled. Paired-device records are kept, but mobile credentials are rejected until you enable this again.
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between gap-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Reachable server URL</label>
            <button type="button" class="text-xs font-medium text-blue-700 hover:text-blue-900" @click="store.refreshCandidates">
              Refresh candidates
            </button>
          </div>
          <select
            v-model="store.selectedServerBaseUrl"
            class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            data-testid="phone-access-candidate-select"
          >
            <option v-for="candidate in store.candidates" :key="candidate.id" :value="candidate.serverBaseUrl">
              {{ candidate.label }} — {{ candidate.serverBaseUrl }}
            </option>
          </select>
        </div>

        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Manual/private-network URL</label>
          <div class="mt-2 flex gap-2">
            <input
              v-model="store.manualServerBaseUrl"
              type="text"
              placeholder="http://desktop-name.vpn:29695"
              class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              data-testid="phone-access-manual-url"
            />
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              @click="store.refreshCandidates"
            >
              Use
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            :disabled="!store.phoneAccessEnabled || !store.selectedServerBaseUrl"
            data-testid="phone-access-create-qr"
            @click="onCreateQr"
          >
            Create QR code
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            :disabled="store.devices.length === 0"
            data-testid="phone-access-revoke-all"
            @click="onRevokeAll"
          >
            Revoke all phones
          </button>
        </div>

        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-600">Paired phones</h4>
          <div v-if="store.devices.length === 0" class="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            No phones paired yet.
          </div>
          <div v-else class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
            <div v-for="device in store.devices" :key="device.deviceId" class="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-900">{{ device.displayName }}</p>
                <p class="break-all font-mono text-xs text-slate-500">{{ device.clientFacingBaseUrl }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  Paired {{ formatDate(device.createdAt) }} · Last seen {{ device.lastSeenAt ? formatDate(device.lastSeenAt) : 'never' }}
                  <span v-if="device.revokedAt" class="text-red-600"> · Revoked {{ formatDate(device.revokedAt) }}</span>
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                :disabled="Boolean(device.revokedAt)"
                @click="store.revokeDevice(device.deviceId)"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 class="text-sm font-semibold text-slate-900">Pairing QR</h4>
        <p class="mt-1 text-xs text-slate-500">Scan or open this from the phone. It contains a short-lived one-time code, not the long-lived device credential.</p>
        <div v-if="qrDataUrl" class="mt-3 flex justify-center rounded-lg bg-white p-3">
          <img :src="qrDataUrl" alt="Phone Access pairing QR" class="h-56 w-56" data-testid="phone-access-qr-image" />
        </div>
        <div v-else class="mt-3 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No active QR code.
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
import { onMounted, ref, watch } from 'vue';
import { usePhoneAccessStore } from '~/stores/phoneAccessStore';
import { toQrCodeDataUrl } from '~/services/qr/qrCodeDataUrlService';

const store = usePhoneAccessStore();
const qrDataUrl = ref<string | null>(null);

const formatDate = (value: string): string => new Date(value).toLocaleString();

async function renderQr(): Promise<void> {
  qrDataUrl.value = store.activePairing?.qrText
    ? await toQrCodeDataUrl(store.activePairing.qrText)
    : null;
}

async function onToggle(enabled: boolean): Promise<void> {
  await store.setEnabled(enabled);
}

async function onCreateQr(): Promise<void> {
  await store.createPairingSession();
  await renderQr();
}

async function onRevokeAll(): Promise<void> {
  const confirmed = window.confirm('Revoke every paired phone? Every phone must pair again.');
  if (!confirmed) {
    return;
  }
  const count = await store.revokeAllDevices();
  window.alert(`Revoked ${count} phone credential${count === 1 ? '' : 's'}.`);
}

watch(() => store.activePairing?.qrText, renderQr);

onMounted(async () => {
  await store.loadAll();
  await renderQr();
});
</script>
