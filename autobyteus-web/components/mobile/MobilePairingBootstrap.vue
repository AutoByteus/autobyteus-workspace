<template>
  <!-- In the Android app a pairing link pairs at once and only the outcome shows (DS-005, DEC-007). -->
  <section v-if="inApp && hasLink" class="flex min-h-screen flex-col bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]" data-testid="mobile-pairing-in-app">
    <template v-if="failure">
      <button type="button" class="flex h-12 w-12 items-center justify-center rounded-full text-slate-700 active:bg-slate-100" aria-label="Back to nodes" data-testid="mobile-pairing-back" @click="bridge?.showNodeList()">
        <Icon icon="heroicons:arrow-left-20-solid" class="h-6 w-6" aria-hidden="true" />
      </button>
      <div class="flex flex-1 flex-col items-center justify-center px-6 text-center" role="status" data-testid="mobile-pairing-failed">
        <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Icon icon="heroicons:exclamation-triangle-20-solid" class="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 class="mt-5 text-[1.375rem] font-semibold leading-7 text-slate-950">Can’t reach {{ nodeName }}</h1>
        <p class="mt-2 text-[0.9375rem] leading-6 text-slate-600" data-testid="mobile-pairing-reason">{{ failureReason }}</p>
      </div>
      <button type="button" class="h-14 w-full rounded-2xl border border-slate-300 text-[1.0625rem] font-semibold text-slate-700 active:bg-slate-100" data-testid="mobile-pairing-scan-again" @click="bridge?.startScan()">
        Scan again
      </button>
    </template>
    <div v-else class="flex flex-1 flex-col items-center justify-center px-6 text-center" role="status" data-testid="mobile-pairing-connecting">
      <span class="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600 motion-reduce:animate-none" aria-hidden="true" />
      <h1 class="mt-5 text-[1.375rem] font-semibold leading-7 text-slate-950">Connecting to {{ nodeName }}</h1>
    </div>
  </section>

  <div v-else class="min-h-screen bg-slate-100">
    <div class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8" data-testid="mobile-pairing-bootstrap">
      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="flex items-center gap-2.5">
          <img src="/autobyteus-icon.svg" alt="" class="h-7 w-7" aria-hidden="true" />
          <span class="text-base font-semibold text-slate-900">AutoByteus</span>
        </div>

        <div v-if="$slots.notice" class="mt-4">
          <slot name="notice" />
        </div>

        <!-- A pairing link opened in a browser (the camera scanned the QR): one tap (REQ-018). -->
        <template v-if="hasLink">
          <span class="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Icon icon="heroicons:computer-desktop-20-solid" class="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 class="mt-4 text-[1.375rem] font-semibold leading-7 text-slate-950" data-testid="mobile-pairing-node-name">{{ nodeName }}</h1>
          <p class="mt-1 text-[0.9375rem] leading-6 text-slate-600">Connect this phone to use its runs.</p>
          <p v-if="failure" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900" role="alert" data-testid="mobile-pairing-error">{{ failureReason }}</p>
          <button type="button" :class="PRIMARY_BUTTON" :disabled="sessionStore.isPairing" data-testid="mobile-pair-button" @click="pair(pairingLink)">
            <span v-if="sessionStore.isPairing" class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />
            {{ sessionStore.isPairing ? 'Connecting…' : `Connect to ${nodeName}` }}
          </button>
        </template>

        <!-- No link: nothing to connect to yet. -->
        <template v-else>
          <span class="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon icon="heroicons:qr-code-20-solid" class="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 class="mt-4 text-[1.375rem] font-semibold leading-7 text-slate-950">Connect this phone</h1>
          <p class="mt-1 text-[0.9375rem] leading-6 text-slate-600" data-testid="mobile-pairing-instructions">Scan the QR code on your computer with this phone’s camera.</p>
          <p v-if="failure || pastedTextInvalid" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900" role="alert" data-testid="mobile-pairing-error">
            {{ pastedTextInvalid ? 'That isn’t an AutoByteus pairing link.' : failureReason }}
          </p>
        </template>

        <a :href="ANDROID_APP_URL" target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex min-h-[3rem] items-center gap-1.5 text-[0.9375rem] font-semibold text-blue-700" data-testid="mobile-get-app">
          Get the Android app
          <Icon icon="heroicons:arrow-top-right-on-square-20-solid" class="h-4 w-4" aria-hidden="true" />
        </a>

        <details v-if="!hasLink" class="group mt-2 border-t border-slate-100 pt-3" data-testid="mobile-other-ways">
          <summary class="flex min-h-[3rem] cursor-pointer list-none items-center justify-between text-[0.9375rem] font-medium text-slate-600 [&::-webkit-details-marker]:hidden">
            Other ways to connect
            <Icon icon="heroicons:chevron-down-20-solid" class="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <label for="mobile-pairing-text" class="mt-2 block text-sm font-medium text-slate-700">Paste a pairing link</label>
          <textarea id="mobile-pairing-text" v-model="pastedText" class="mt-1.5 h-24 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Paste the link from your computer" data-testid="mobile-pairing-text" />
          <button type="button" class="mt-3 h-12 w-full rounded-xl border border-slate-300 text-[0.9375rem] font-semibold text-slate-700 active:bg-slate-100 disabled:opacity-50" :disabled="!pastedText.trim() || sessionStore.isPairing" data-testid="mobile-paste-connect" @click="pairPasted">
            {{ sessionStore.isPairing ? 'Connecting…' : 'Connect' }}
          </button>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, onMounted, ref } from 'vue';
import { readPairingLink, useMobileNodeSessionStore, type MobilePairingFailure } from '~/stores/mobileNodeSessionStore';
import { nodeNameOrDefault } from '~/utils/remoteAccess/nodeName';
import { getShellBridge, type ShellBridge } from '~/utils/remoteAccess/shellBridge';

const emit = defineEmits<{
  paired: [];
  'pairing-failed': [];
  'pairing-started': [];
}>();

/** The Android app is published on the project's GitHub releases (E-19). */
const ANDROID_APP_URL = 'https://github.com/AutoByteus/autobyteus-workspace/releases/latest';
const PRIMARY_BUTTON = 'mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[1.0625rem] font-semibold text-white active:bg-blue-700 disabled:opacity-70';

const sessionStore = useMobileNodeSessionStore();
const bridge = ref<ShellBridge | null>(null);
const inApp = computed(() => bridge.value !== null);
/** The `?pairing=` link this page was opened with. */
const pairingLink = ref('');
const pastedText = ref('');
const pastedTextInvalid = ref(false);
const failure = ref<MobilePairingFailure | null>(null);

const linkPayload = computed(() => readPairingLink(pairingLink.value));
const hasLink = computed(() => linkPayload.value !== null);
/** The QR's name for the node, else "AutoByteus node": never its address (autobyteus-433). */
const nodeName = computed(() => nodeNameOrDefault((linkPayload.value ?? readPairingLink(pastedText.value))?.serverName));

const failureReason = computed(() => {
  switch (failure.value) {
    case 'used':
      return 'This code was already used. Make a new one on your computer.';
    case 'phone_access_off':
      return `${nodeName.value} is reachable, but Phone access is off.`;
    case 'no_answer':
      return `${nodeName.value} didn’t answer. Check that the computer is on and awake.`;
    default:
      return 'This code has expired. Make a new one on your computer.';
  }
});

async function pair(text: string, deviceName = 'Phone'): Promise<void> {
  failure.value = null;
  emit('pairing-started');
  try {
    const session = await sessionStore.pairWithQrText(text, deviceName);
    // Only the QR's name: the app must never store the "AutoByteus node" label as the node's name.
    bridge.value?.paired(session.nodeName ?? '');
    emit('paired');
  } catch {
    failure.value = sessionStore.lastPairingFailure ?? 'no_answer';
    emit('pairing-failed');
  }
}

function pairPasted(): void {
  pastedTextInvalid.value = readPairingLink(pastedText.value) === null;
  if (!pastedTextInvalid.value) void pair(pastedText.value);
}

onMounted(async () => {
  bridge.value = getShellBridge();
  pairingLink.value = new URL(window.location.href).searchParams.get('pairing') ?? '';
  if (bridge.value && hasLink.value) {
    // In the app a scan, a pasted or a shared link was the user's deliberate act: pair at once with the phone's name.
    const hello = await bridge.value.hello();
    await pair(pairingLink.value, hello?.deviceName || 'Phone');
  }
});
</script>
