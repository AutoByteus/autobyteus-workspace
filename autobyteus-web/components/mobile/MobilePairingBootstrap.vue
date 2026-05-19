<template>
  <div class="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-8" data-testid="mobile-pairing-bootstrap">
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">AutoByteus Remote Access</p>
      <h1 class="mt-3 text-2xl font-bold text-slate-950">Connect this phone</h1>
      <p class="mt-2 text-sm text-slate-600">
        Scan the Phone Access QR from desktop settings. The normal QR journey is one tap.
      </p>

      <div v-if="$slots.notice" class="mt-4">
        <slot name="notice" />
      </div>

      <div v-if="localError" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p class="font-semibold">Pairing problem</p>
        <p class="mt-1">{{ localError }}</p>
        <p class="mt-1 text-xs">Create a new QR code on desktop or paste the complete pairing link.</p>
      </div>

      <div v-if="sessionStore.lastDiagnostic" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p class="font-semibold">{{ sessionStore.lastDiagnostic.title }}</p>
        <p class="mt-1">{{ sessionStore.lastDiagnostic.message }}</p>
        <p class="mt-1 text-xs">{{ sessionStore.lastDiagnostic.recoveryAction }}</p>
      </div>

      <div v-if="hasDetectedPairingPayload" class="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4" data-testid="mobile-pairing-detected">
        <p class="font-semibold text-blue-950">Pairing link detected from desktop.</p>
        <p class="mt-1 text-sm text-blue-800">Pair this phone with the selected AutoByteus node.</p>
        <button type="button" class="mt-3 text-xs font-semibold text-blue-700 underline" @click="showPairingText = !showPairingText">
          {{ showPairingText ? 'Hide pairing payload' : 'Show pairing payload' }}
        </button>
      </div>
      <div v-else class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4" data-testid="mobile-pairing-instructions">
        <p class="font-semibold text-slate-900">Scan the QR code from Desktop &gt; Settings &gt; Nodes &gt; Phone Access.</p>
        <p class="mt-1 text-sm text-slate-600">No server URL, port, or token setup is needed in the normal flow.</p>
        <button type="button" class="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700" data-testid="mobile-show-pairing-text" @click="showPairingText = true">
          Paste pairing link
        </button>
      </div>

      <div v-if="showPairingText" class="mt-5" data-testid="mobile-pairing-text-section">
        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">Pairing link or JSON payload</label>
        <textarea
          v-model="pairingText"
          class="mt-2 h-28 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Paste the Phone Access QR payload here"
          data-testid="mobile-pairing-text"
        />
      </div>

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
        {{ sessionStore.isPairing ? 'Pairing…' : 'Pair this phone' }}
      </button>

      <details class="mt-5 border-t border-slate-100 pt-5" data-testid="mobile-manual-url-details">
        <summary class="cursor-pointer text-sm font-semibold text-slate-700">Troubleshoot connection</summary>
        <label class="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">Manual server URL check</label>
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
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';

const emit = defineEmits<{
  paired: [];
  'pairing-failed': [];
  'pairing-started': [];
}>();
const sessionStore = useMobileNodeSessionStore();
const pairingText = ref('');
const manualUrl = ref('');
const deviceName = ref('Phone');
const showPairingText = ref(false);
const localError = ref<string | null>(null);

const hasDetectedPairingPayload = computed(() => Boolean(pairingText.value.trim()) && !showPairingText.value);

const readInitialPairingText = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return new URL(window.location.href).searchParams.get('pairing') || '';
};

async function pair(): Promise<void> {
  localError.value = null;
  emit('pairing-started');
  try {
    await sessionStore.pairWithQrText(pairingText.value, deviceName.value || 'Phone');
    emit('paired');
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Pairing failed.';
    emit('pairing-failed');
  }
}

async function checkManualUrl(): Promise<void> {
  await sessionStore.fetchStatus(manualUrl.value);
}

onMounted(() => {
  pairingText.value = readInitialPairingText();
  showPairingText.value = false;
});
</script>
