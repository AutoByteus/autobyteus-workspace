<template>
  <div class="rounded-md border border-gray-200 bg-white p-3" data-testid="scannable-qr-panel">
    <p class="text-xs text-gray-600">Scan this QR using {{ providerLabel }} on your phone.</p>

    <div v-if="isRendering" class="mt-2 text-xs text-gray-500" data-testid="qr-rendering-state">
      Rendering QR...
    </div>

    <div v-else-if="qrDataUrl" class="mt-3 flex justify-center">
      <img
        :src="qrDataUrl"
        :alt="`${providerLabel} personal session QR code`"
        class="max-h-72 w-auto rounded border border-gray-100"
        data-testid="qr-image"
      />
    </div>

    <div v-else class="mt-2">
      <p class="text-xs text-amber-700" data-testid="qr-render-error">
        {{ renderError || 'QR image is unavailable.' }}
      </p>
      <pre
        class="mt-2 max-h-44 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"
        data-testid="qr-raw-payload"
      >{{ qrCode }}</pre>
      <button
        type="button"
        class="mt-2 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
        @click="renderQrCode"
        data-testid="retry-qr-render-button"
      >
        Retry Render
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toQrCodeDataUrl } from '~/services/qr/qrCodeDataUrlService';
import type { PersonalSessionProvider } from '~/types/messaging';

const props = defineProps<{
  qrCode: string;
  provider: PersonalSessionProvider;
}>();

const providerLabel = computed(() => (props.provider === 'WECHAT' ? 'WeChat' : 'WhatsApp'));

const qrDataUrl = ref<string | null>(null);
const renderError = ref<string | null>(null);
const isRendering = ref(false);

async function renderQrCode(): Promise<void> {
  if (!props.qrCode.trim()) {
    qrDataUrl.value = null;
    renderError.value = 'QR payload is empty.';
    return;
  }

  isRendering.value = true;
  renderError.value = null;

  try {
    qrDataUrl.value = await toQrCodeDataUrl(props.qrCode);
  } catch (error) {
    qrDataUrl.value = null;
    renderError.value = error instanceof Error ? error.message : 'Failed to render QR image.';
  } finally {
    isRendering.value = false;
  }
}

watch(
  () => props.qrCode,
  async () => {
    await renderQrCode();
  },
  { immediate: true },
);
</script>
