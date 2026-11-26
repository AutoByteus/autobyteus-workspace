<template>
  <Teleport to="body">
    <!-- View log -->
    <div v-if="logItem" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="extension-log-overlay" @click.self="store.logFor = null" @keydown.esc="store.logFor = null">
      <div class="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="extension-log-title" data-testid="extension-log-dialog">
        <div class="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
          <div>
            <h3 id="extension-log-title" class="text-lg font-semibold text-gray-900">{{ t('extensions.log.title', { name: nameOf(logItem) }) }}</h3>
            <p class="mt-0.5 text-sm text-gray-500">{{ t('extensions.log.lead', { count: store.logLines.length, node: nodeName }) }}</p>
          </div>
          <button ref="logClose" type="button" class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-label="t('extensions.dialog.close')" @click="store.logFor = null">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke-linecap="round" /></svg>
          </button>
        </div>
        <div class="mx-6 min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50">
          <pre v-if="store.logLines.length" class="whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-5 text-gray-800" lang="en" data-testid="extension-log-lines">{{ store.logLines.join('\n') }}</pre>
          <p v-else class="px-4 py-6 text-center text-sm text-gray-500">{{ t('extensions.log.empty') }}</p>
        </div>
        <div class="flex justify-end gap-2 px-6 py-4">
          <button type="button" class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60" :disabled="!store.logLines.length" @click="copyLog">{{ copied ? t('extensions.log.copied') : t('extensions.log.copy') }}</button>
          <button type="button" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" @click="store.logFor = null">{{ t('extensions.dialog.close') }}</button>
        </div>
      </div>
    </div>

    <!-- Remove -->
    <div v-if="removeItem" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="extension-remove-overlay" @click.self="store.removeFor = null" @keydown.esc="store.removeFor = null">
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="extension-remove-title" aria-describedby="extension-remove-text" data-testid="extension-remove-dialog">
        <h3 id="extension-remove-title" class="text-lg font-semibold text-gray-900">{{ t('extensions.remove.title', { name: nameOf(removeItem) }) }}</h3>
        <p id="extension-remove-text" class="mt-2 text-sm leading-6 text-gray-600">{{ removeText(removeItem) }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button ref="removeCancel" type="button" class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="store.removeFor = null">{{ t('extensions.dialog.cancel') }}</button>
          <button type="button" class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" data-testid="extension-remove-confirm" @click="store.remove(removeItem.id)">{{ t('extensions.remove.confirm') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useExtensionsStore } from '~/stores/extensionsStore';
import { extensionTextOf, type ExtensionItem } from '~/types/extensions';

/** The log of one extension (V11) and the Remove confirmation (V10), for the extensions of this window's node. */
const props = defineProps<{ nodeName: string }>();
const { t, resolvedLocale } = useLocalization();
const store = useExtensionsStore();
const copied = ref(false);
const logClose = ref<HTMLButtonElement | null>(null);
const removeCancel = ref<HTMLButtonElement | null>(null);

const nameOf = (item: ExtensionItem): string => extensionTextOf(item, String(resolvedLocale.value ?? 'en')).name;
const logItem = computed(() => (store.logFor ? store.itemOf(store.logFor) : null));
const removeItem = computed(() => (store.removeFor ? store.itemOf(store.removeFor) : null));
const nodeName = computed(() => props.nodeName);
/** Voice Input has its own Remove text (what it deletes); another extension gets the general one. */
const removeText = (item: ExtensionItem): string => (item.id === 'voice-input'
  ? t('extensions.remove.text.voice-input', { node: nodeName.value })
  : t('extensions.remove.text.general', { name: nameOf(item), node: nodeName.value }));

watch(() => store.logFor, async (value) => { copied.value = false; if (value) { await nextTick(); logClose.value?.focus(); } });
watch(() => store.removeFor, async (value) => { if (value) { await nextTick(); removeCancel.value?.focus(); } });

async function copyLog(): Promise<void> {
  try {
    await navigator.clipboard.writeText(store.logLines.join('\n'));
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    copied.value = false;
  }
}
</script>
