<template>
  <div class="relative" :data-testid="`extension-page-${extensionId}`">
    <iframe
      ref="frame"
      :title="title"
      :src="src"
      sandbox="allow-scripts"
      allow="clipboard-write"
      referrerpolicy="no-referrer"
      class="block w-full border-0 bg-transparent"
      :style="{ height: `${height}px` }"
      @load="onLoad"
    />
    <p v-if="!sized" class="absolute inset-x-0 top-0 flex items-center gap-2 text-sm text-gray-500">
      <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500 motion-reduce:animate-none" aria-hidden="true" />
      {{ t('extensions.page.loading') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { connectExtensionPage } from '~/services/extensions/extensionPageBridge';
import { useExtensionsStore } from '~/stores/extensionsStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { deriveNodeEndpoints } from '~/utils/nodeEndpoints';

/**
 * An extension's own page (extension-contract.md §5), served by this window's node from the installed package with
 * the sandbox CSP, in a sandboxed frame without `allow-same-origin`: it reaches neither the node nor this page, only
 * its own extension's actions through the bridge. Its height comes from its `{ resize }` message.
 */
const props = defineProps<{ extensionId: string; title: string }>();
const { t, resolvedLocale } = useLocalization();
const store = useExtensionsStore();
const windowNode = useWindowNodeContextStore();
const frame = ref<HTMLIFrameElement | null>(null);
const height = ref(120);
const sized = ref(false);
const src = computed(() => `${deriveNodeEndpoints(windowNode.nodeBaseUrl).rest}/extensions/${encodeURIComponent(props.extensionId)}/ui/index.html`);

const bridge = connectExtensionPage({
  frame: () => frame.value,
  call: (action, input) => store.callAction(props.extensionId, action, input),
  resize: (next) => { height.value = next; sized.value = true; },
});
const onLoad = () => bridge.pageLoaded(String(resolvedLocale.value ?? 'en'));
onBeforeUnmount(() => bridge.dispose());
</script>
