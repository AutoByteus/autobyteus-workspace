<template>
  <!-- The shown code: QR, how the phone will connect, time left, Close / New code, and About this code (REQ-015). -->
  <div v-if="code" class="mt-4 flex flex-col gap-6 first:mt-0 sm:flex-row sm:items-start" data-testid="phone-code">
    <div class="relative h-[208px] w-[208px] flex-shrink-0 rounded-xl border border-slate-200 bg-white p-2.5">
      <img v-if="qrDataUrl" :src="qrDataUrl" :alt="t('settings.components.settings.phone.code.qrAlt')" class="h-full w-full transition-opacity" :class="expired ? 'opacity-10' : ''" data-testid="phone-qr-image" />
      <div v-if="expired" class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center" data-testid="phone-qr-expired">
        <Icon icon="heroicons:clock-20-solid" class="h-6 w-6 text-slate-400" aria-hidden="true" />
        <p class="text-sm font-semibold text-slate-700">{{ t('settings.components.settings.phone.code.expired') }}</p>
      </div>
    </div>

    <div class="min-w-0 flex-1">
      <p class="flex items-center gap-2 text-base font-semibold leading-6 text-slate-900" data-testid="phone-code-line">
        <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :class="code.way === 'local_network' ? 'bg-amber-500' : 'bg-emerald-500'" aria-hidden="true" />
        <span class="min-w-0 break-words">{{ resultLine }}</span>
      </p>
      <p class="mt-1 text-sm leading-6 text-slate-600">{{ t('settings.components.settings.phone.code.scanHint') }}</p>

      <p v-if="!expired" class="mt-3 inline-flex items-center gap-1.5 text-sm tabular-nums" :class="secondsLeft <= 60 ? 'font-semibold text-amber-700' : 'text-slate-600'" role="timer" data-testid="phone-code-timer">
        <Icon icon="heroicons:clock-20-solid" class="h-4 w-4" aria-hidden="true" />
        {{ t('settings.components.settings.phone.code.validFor', { time: timeLeft }) }}
      </p>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          v-if="expired"
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          data-testid="phone-new-code"
          @click="store.newCode()"
        >
          <Icon icon="heroicons:arrow-path-20-solid" class="h-5 w-5" aria-hidden="true" />
          {{ t('settings.components.settings.phone.code.newCode') }}
        </button>
        <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="phone-code-close" @click="store.discardCode()">
          {{ t('settings.components.settings.phone.code.close') }}
        </button>
      </div>
      <p class="mt-4 text-xs leading-5 text-slate-500" data-testid="phone-code-footnote">{{ t('settings.components.settings.phone.code.footnote') }}</p>
      <button type="button" class="mt-1 flex items-center gap-1 rounded-md py-1 text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-expanded="aboutOpen" data-testid="phone-about-code-toggle" @click="aboutOpen = !aboutOpen">
        <Icon icon="heroicons:chevron-right-20-solid" class="h-3.5 w-3.5 text-slate-400 transition-transform" :class="aboutOpen ? 'rotate-90' : ''" aria-hidden="true" />
        {{ t('settings.components.settings.phone.code.aboutToggle') }}
      </button>
      <p v-if="aboutOpen" class="mt-1 max-w-md text-xs leading-5 text-slate-500" data-testid="phone-about-code">{{ t('settings.components.settings.phone.code.about') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { toQrCodeDataUrl } from '~/services/qr/qrCodeDataUrlService';
import { usePhoneAccessStore } from '~/stores/phoneAccessStore';

const { t } = useLocalization();
const store = usePhoneAccessStore();

const code = computed(() => store.code);
const expired = computed(() => store.codePhase === 'expired');
const aboutOpen = ref(false);
const qrDataUrl = ref<string | null>(null);

const resultLine = computed(() => {
  const shown = code.value;
  if (!shown) return '';
  if (shown.typed) return t('settings.components.settings.phone.code.line.typed', { address: shown.address });
  if (shown.way === 'company_address') return t('settings.components.settings.phone.code.line.company_address', { address: shown.address });
  return t(`settings.components.settings.phone.code.line.${shown.way}`);
});

// The timer ticks once a second from the code's own expiry; at 0:00 the store marks it expired (no request).
const secondsLeft = ref(0);
let ticker: ReturnType<typeof setInterval> | null = null;
const stopTicker = (): void => {
  if (ticker) clearInterval(ticker);
  ticker = null;
};
const tick = (): void => {
  const expiresAt = code.value ? Date.parse(code.value.expiresAt) : 0;
  secondsLeft.value = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  if (secondsLeft.value === 0) {
    stopTicker();
    store.markCodeExpired();
  }
};
const timeLeft = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`);

watch(() => code.value?.sessionId, async () => {
  stopTicker();
  const shown = code.value;
  qrDataUrl.value = shown ? await toQrCodeDataUrl(shown.qrText) : null;
  if (shown && store.codePhase === 'shown') {
    tick();
    ticker = setInterval(tick, 1000);
  }
}, { immediate: true });

onBeforeUnmount(stopTicker);
</script>
