<template>
  <div class="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-8">
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">AutoByteus Remote Access</p>
      <h1 class="mt-3 text-2xl font-bold text-slate-950">Connect this phone</h1>
      <p class="mt-2 text-sm text-slate-600">
        Scan the Phone Access QR from desktop settings, or paste the copied pairing link below.
      </p>

      <div v-if="$slots.notice" class="mt-4">
        <slot name="notice" />
      </div>

      <div v-if="sessionStore.lastDiagnostic" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p class="font-semibold">{{ sessionStore.lastDiagnostic.title }}</p>
        <p class="mt-1">{{ sessionStore.lastDiagnostic.message }}</p>
        <p class="mt-1 text-xs">{{ sessionStore.lastDiagnostic.recoveryAction }}</p>
      </div>

      <label class="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Pairing link or JSON payload</label>
      <textarea
        v-model="pairingText"
        class="mt-2 h-32 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        placeholder="Paste the Phone Access QR payload here"
        data-testid="mobile-pairing-text"
      />

      <label class="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">This device name</label>
      <input
        v-model="deviceName"
        class="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        placeholder="Normy's phone"
        data-testid="mobile-device-name"
      />

      <button
        type="button"
        class="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        :disabled="sessionStore.isPairing || !pairingText.trim()"
        data-testid="mobile-pair-button"
        @click="pair"
      >
        {{ sessionStore.isPairing ? 'Pairing…' : 'Pair phone' }}
      </button>

      <div class="mt-5 border-t border-slate-100 pt-5">
        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">Manual server URL check</label>
        <div class="mt-2 flex gap-2">
          <input
            v-model="manualUrl"
            class="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="http://desktop:29695"
            data-testid="mobile-manual-url"
          />
          <button type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" @click="checkManualUrl">
            Check
          </button>
        </div>
        <p v-if="sessionStore.lastStatus" class="mt-2 text-xs text-slate-600">
          Server reachable. Phone Access: {{ sessionStore.lastStatus.phoneAccessEnabled ? 'enabled' : 'disabled' }}.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';

const emit = defineEmits<{ paired: [] }>();
const sessionStore = useMobileNodeSessionStore();
const pairingText = ref('');
const manualUrl = ref('');
const deviceName = ref('Phone');

const readInitialPairingText = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return new URL(window.location.href).searchParams.get('pairing') || '';
};

async function pair(): Promise<void> {
  await sessionStore.pairWithQrText(pairingText.value, deviceName.value || 'Phone');
  emit('paired');
}

async function checkManualUrl(): Promise<void> {
  await sessionStore.fetchStatus(manualUrl.value);
}

onMounted(() => {
  pairingText.value = readInitialPairingText();
});
</script>
