<template>
  <!-- One way to connect: status, its button or its code, How it works, and Advanced on Tailscale. -->
  <div :id="`phone-panel-${way}`" role="tabpanel" :aria-labelledby="`phone-tab-${way}`" class="mt-4 rounded-xl border border-slate-200 p-5" :data-testid="`phone-panel-${way}`">
    <template v-if="!codeOnScreen">
      <p class="flex items-start gap-2 text-sm font-medium leading-6" :class="ready ? 'text-emerald-700' : 'text-slate-700'" data-testid="phone-way-status">
        <span class="mt-2 h-2 w-2 flex-shrink-0 rounded-full" :class="ready ? 'bg-emerald-500' : 'bg-slate-300'" aria-hidden="true" />
        {{ t(`settings.components.settings.phone.status.${way}.${ready ? 'ready' : 'notReady'}`) }}
      </p>
      <p v-if="store.stillNotFound.has(way) && !store.isChecking" class="mt-0.5 pl-4 text-sm leading-6 text-slate-500" data-testid="phone-check-note">
        {{ t(`settings.components.settings.phone.note.${way}`) }}
      </p>
    </template>

    <!-- Same Wi-Fi: the first press is the decision; afterwards a switch keeps the answer (REQ-004). -->
    <template v-if="way === 'local_network' && ready">
      <div v-if="!store.localNetworkAllowed" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" data-testid="phone-wifi-question">
        <p class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.phone.wifi.questionTitle') }}</p>
        <p class="mt-0.5 text-sm leading-5 text-slate-600">{{ t('settings.components.settings.phone.wifi.questionBody') }}</p>
        <p class="mt-1 text-xs leading-5 text-slate-500">{{ t('settings.components.settings.phone.wifi.questionNote') }}</p>
      </div>
      <div v-else class="mt-4 flex items-center justify-between gap-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" data-testid="phone-wifi-allowed">
        <div class="min-w-0">
          <p id="phone-wifi-switch-label" class="text-sm font-medium text-slate-900">{{ t('settings.components.settings.phone.wifi.allowedTitle') }}</p>
          <p class="mt-0.5 text-sm leading-5 text-slate-600">{{ t('settings.components.settings.phone.wifi.allowedNote') }}</p>
        </div>
        <button
          type="button"
          role="switch"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full bg-emerald-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          aria-checked="true"
          aria-labelledby="phone-wifi-switch-label"
          data-testid="phone-wifi-switch"
          @click="store.forgetLocalNetwork()"
        >
          <span aria-hidden="true" class="inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow-sm transition-transform" />
        </button>
      </div>
    </template>

    <!-- Company address: shown when set up, otherwise the field for the address IT gave. -->
    <div v-if="way === 'company_address' && !codeOnScreen" class="mt-4" data-testid="phone-company-address">
      <p v-if="ready" class="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800" data-testid="phone-company-address-value">{{ store.readiness.company_address.address }}</p>
      <form v-else @submit.prevent="useTypedAddress">
        <label for="phone-typed-address" class="text-sm font-medium text-slate-900">{{ t('settings.components.settings.phone.company.fieldLabel') }}</label>
        <div class="mt-1.5 flex max-w-xl items-center gap-2">
          <input
            id="phone-typed-address"
            v-model="typedAddress"
            type="text"
            inputmode="url"
            autocomplete="off"
            :placeholder="t('settings.components.settings.phone.company.fieldPlaceholder')"
            class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            :aria-describedby="store.typedAddressError ? 'phone-typed-address-error' : undefined"
            data-testid="phone-typed-address"
          />
          <button type="submit" :class="SECONDARY_BUTTON" :disabled="!typedAddress.trim() || store.codePhase === 'creating'" data-testid="phone-typed-address-use">
            {{ t('settings.components.settings.phone.company.use') }}
          </button>
        </div>
        <p v-if="store.typedAddressError" id="phone-typed-address-error" class="mt-1.5 text-sm text-red-700" role="alert" data-testid="phone-typed-address-error">
          {{ typedAddressErrorText }}
        </p>
      </form>
    </div>

    <div v-if="!codeOnScreen" class="mt-5 flex flex-wrap items-center gap-3">
      <button
        v-if="!(way === 'company_address' && !ready)"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
        :disabled="!ready || store.codePhase === 'creating'"
        data-testid="phone-show-qr"
        @click="store.showCode()"
      >
        <Icon icon="heroicons:qr-code-20-solid" class="h-5 w-5" aria-hidden="true" />
        {{ showButtonLabel }}
      </button>
      <button v-if="(way === 'tailscale' || way === 'vpn') && !ready" type="button" :class="SECONDARY_BUTTON" :disabled="store.isChecking" data-testid="phone-check-again" @click="store.checkAgain(way)">
        {{ store.isChecking ? t('settings.components.settings.phone.button.checking') : t('settings.components.settings.phone.button.checkAgain') }}
      </button>
    </div>
    <p v-if="store.codeError" class="mt-3 text-sm text-red-700" role="alert" data-testid="phone-code-error">{{ store.codeError }}</p>

    <PhoneCodeBlock v-if="codeOnScreen" />

    <div class="mt-5 border-t border-slate-100" data-testid="phone-how-it-works">
      <button type="button" :class="FOLD_BUTTON" :aria-expanded="howOpen" aria-controls="phone-how-body" data-testid="phone-how-toggle" @click="howToggled = !howOpen">
        <Icon icon="heroicons:chevron-right-20-solid" class="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform" :class="howOpen ? 'rotate-90' : ''" aria-hidden="true" />
        {{ t('settings.components.settings.phone.how.toggle') }}
      </button>
      <div v-if="howOpen" id="phone-how-body" class="max-w-2xl pb-3 pl-[1.375rem] pr-6" data-testid="phone-how-body">
        <p class="text-sm leading-6 text-slate-700">{{ t(`settings.components.settings.phone.how.${way}.line`) }}</p>
        <dl class="mt-3 space-y-1.5 text-sm leading-6 text-slate-600">
          <div class="grid grid-cols-[4.25rem_1fr] gap-x-3">
            <dt class="font-medium text-slate-800">{{ t('settings.components.settings.phone.how.when') }}</dt>
            <dd>{{ t(`settings.components.settings.phone.how.${way}.when`) }}</dd>
          </div>
          <div class="grid grid-cols-[4.25rem_1fr] gap-x-3">
            <dt class="font-medium text-slate-800">{{ t('settings.components.settings.phone.how.setup') }}</dt>
            <dd>
              <ol v-if="way === 'tailscale' && !ready" class="list-decimal space-y-1 pl-5 marker:text-slate-400">
                <li>
                  {{ t('settings.components.settings.phone.how.tailscale.setupStep1') }}
                  <a href="https://tailscale.com/download" target="_blank" rel="noopener noreferrer" class="font-medium text-blue-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="phone-get-tailscale">{{ t('settings.components.settings.phone.how.tailscale.getTailscale') }}</a>.
                </li>
                <li>{{ t('settings.components.settings.phone.how.tailscale.setupStep2') }}</li>
              </ol>
              <template v-else-if="way === 'tailscale'">{{ t('settings.components.settings.phone.how.tailscale.setupReady') }}</template>
              <template v-else>{{ t(`settings.components.settings.phone.how.${way}.setup`) }}</template>
            </dd>
          </div>
          <div class="grid grid-cols-[4.25rem_1fr] gap-x-3">
            <dt class="font-medium text-slate-800">{{ t('settings.components.settings.phone.how.safety') }}</dt>
            <dd>{{ t(`settings.components.settings.phone.how.${way}.safety`) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Tailscale: the optional secure web address (REQ-008). AutoByteus shows the command and never runs it. -->
    <div v-if="way === 'tailscale' && store.offersTailscaleServeCommand" class="border-t border-slate-100" data-testid="phone-advanced">
      <button type="button" :class="FOLD_BUTTON" :aria-expanded="advancedOpen" aria-controls="phone-advanced-body" data-testid="phone-advanced-toggle" @click="advancedOpen = !advancedOpen">
        <Icon icon="heroicons:chevron-right-20-solid" class="h-4 w-4 text-slate-400 transition-transform" :class="advancedOpen ? 'rotate-90' : ''" aria-hidden="true" />
        {{ t('settings.components.settings.phone.advanced.toggle') }}
      </button>
      <div v-if="advancedOpen" id="phone-advanced-body" class="max-w-2xl pb-3 pl-[1.375rem]">
        <p class="text-sm font-medium text-slate-900">{{ t('settings.components.settings.phone.advanced.title') }}</p>
        <p v-if="store.tailscaleHttpsReady" class="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500" data-testid="phone-serve-ready">
          <Icon icon="heroicons:check-circle-20-solid" class="h-4 w-4 text-emerald-600" aria-hidden="true" />
          {{ t('settings.components.settings.phone.advanced.ready') }}
        </p>
        <template v-else>
          <p class="mt-0.5 text-sm leading-5 text-slate-500">{{ t('settings.components.settings.phone.advanced.body', { name: store.nodeName }) }}</p>
          <div class="mt-2 flex items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800" :title="serveCommand" data-testid="phone-serve-command">{{ serveCommand }}</code>
            <button type="button" :class="[SECONDARY_BUTTON, '!px-3 !py-2 inline-flex items-center gap-1.5']" data-testid="phone-serve-copy" @click="copyCommand">
              <Icon :icon="copied ? 'heroicons:check-20-solid' : 'heroicons:clipboard-document-20-solid'" class="h-4 w-4" aria-hidden="true" />
              {{ copied ? t('settings.components.settings.phone.advanced.copied') : t('settings.components.settings.phone.advanced.copy') }}
            </button>
            <button type="button" :class="[SECONDARY_BUTTON, '!px-3 !py-2']" :disabled="store.isChecking" data-testid="phone-serve-check" @click="store.checkAgain('tailscale')">
              {{ store.isChecking ? t('settings.components.settings.phone.button.checking') : t('settings.components.settings.phone.button.checkAgain') }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import PhoneCodeBlock from '~/components/settings/phone/PhoneCodeBlock.vue';
import { useLocalization } from '~/composables/useLocalization';
import { usePhoneAccessStore } from '~/stores/phoneAccessStore';
import type { ConnectionWay } from '~/types/remoteAccess';
import { buildTailscaleServeCommand } from '~/utils/phoneAccess/tailscaleServeCommand';

const props = defineProps<{ way: ConnectionWay }>();

const SECONDARY_BUTTON = 'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60';
const FOLD_BUTTON = 'flex w-full items-center gap-1.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

const { t } = useLocalization();
const store = usePhoneAccessStore();

const ready = computed(() => store.readiness[props.way].ready);
const codeOnScreen = computed(() => store.codePhase === 'shown' || store.codePhase === 'expired');

// How it works is closed until clicked; it opens by itself when the way is not ready (the user must set it up).
const howToggled = ref<boolean | null>(null);
const howOpen = computed(() => howToggled.value ?? !ready.value);
const advancedOpen = ref(false);

const showButtonLabel = computed(() => {
  if (store.codePhase === 'creating') return t('settings.components.settings.phone.button.creating');
  const firstOnNetwork = props.way === 'local_network' && !store.localNetworkAllowed;
  if (!store.phoneAccessEnabled) {
    return firstOnNetwork
      ? t('settings.components.settings.phone.button.turnOnAllowAndShowQr')
      : t('settings.components.settings.phone.button.turnOnAndShowQr');
  }
  return firstOnNetwork
    ? t('settings.components.settings.phone.button.allowAndShowQr')
    : t('settings.components.settings.phone.button.showQr');
});

const typedAddress = ref('');
const typedAddressErrorText = computed(() => {
  const error = store.typedAddressError;
  if (!error) return '';
  return error.kind === 'not_this_node'
    ? t('settings.components.settings.phone.company.notThisNode', { name: store.nodeName })
    : error.message;
});
function useTypedAddress(): void {
  if (typedAddress.value.trim()) void store.useTypedAddress(typedAddress.value.trim());
}

const serveCommand = computed(() => buildTailscaleServeCommand({
  platform: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  nodePort: store.nodePort,
  httpsPort: store.tailscaleServeHttpsPort,
}));

const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;
async function copyCommand(): Promise<void> {
  try {
    await navigator.clipboard.writeText(serveCommand.value);
  } catch {
    return;
  }
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => { copied.value = false; }, 1600);
}
onBeforeUnmount(() => { if (copiedTimer) clearTimeout(copiedTimer); });
</script>
