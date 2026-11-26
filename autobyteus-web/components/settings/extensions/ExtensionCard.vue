<template>
  <section
    class="rounded-xl border border-gray-200 bg-white shadow-sm"
    :aria-labelledby="`extension-title-${item.id}`"
    :data-testid="`extension-card-${item.id}`"
  >
    <!-- The name row and the action share the first row at every width; the details span the card on narrow widths. -->
    <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 p-5">
      <div class="col-start-1 row-start-1 flex min-h-9 min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 :id="`extension-title-${item.id}`" class="text-lg font-semibold leading-7 text-gray-900" :lang="shown.lang">{{ shown.name }}</h3>
        <span v-if="shownVersion" class="text-sm tabular-nums text-gray-500" :data-testid="`extension-version-${item.id}`">{{ shownVersion }}</span>
        <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5" :class="pill.class" :data-testid="`extension-state-${item.id}`">
          <span v-if="pill.dot" class="h-1.5 w-1.5 rounded-full" :class="pill.dot" aria-hidden="true" />
          {{ pill.label }}
        </span>
        <span
          v-if="installed && item.update === 'available'"
          class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium leading-5 text-blue-700"
          :data-testid="`extension-update-badge-${item.id}`"
        >{{ t('extensions.card.updateAvailable', { version: item.catalogVersion ?? '' }) }}</span>
        <span
          v-if="installed && item.update === 'needsNewerAutoByteus'"
          class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium leading-5 text-gray-600"
          :data-testid="`extension-update-needs-newer-app-${item.id}`"
        >{{ t('extensions.card.updateNeedsNewerApp', { version: item.catalogVersion ?? '' }) }}</span>
      </div>

      <div class="col-span-2 row-start-2 min-w-0 sm:col-span-1">
        <p class="mt-1.5 max-w-2xl text-sm leading-6 text-gray-600" :lang="shown.lang">{{ shown.description }}</p>

        <!-- what the extension says now -->
        <button
          v-if="installed && item.update === 'available'"
          type="button"
          class="mt-3 rounded-md border border-blue-200 bg-white px-3.5 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 sm:hidden"
          :disabled="busy || !canInstall"
          :data-testid="`extension-update-narrow-${item.id}`"
          @click="store.update(item.id)"
        >{{ t('extensions.card.update', { version: item.catalogVersion ?? '' }) }}</button>
        <p v-if="item.state === 'notAvailableHere'" class="mt-3 text-sm text-gray-500" :data-testid="`extension-not-available-${item.id}`">
          {{ item.notAvailableReason === 'newerAutoByteus'
            ? t('extensions.card.needsNewerApp', { name: shown.name, version: item.catalogVersion ?? '' })
            : t('extensions.card.notAvailable', { platform: platformLabel(platform), platforms: item.platforms.map(platformLabel).join(', ') }) }}
        </p>
        <div v-else-if="progress" class="mt-3 max-w-xl" :data-testid="`extension-progress-${item.id}`" role="status" aria-live="polite">
          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="min-w-0 truncate text-gray-700" lang="en">{{ progress.message }}</span>
            <span v-if="progress.percent !== null" class="flex-shrink-0 tabular-nums text-gray-500">{{ progress.percent }}%</span>
          </div>
          <div
            class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            :aria-label="progress.message"
            :aria-valuenow="progress.percent ?? undefined"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div v-if="progress.percent !== null" class="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none" :style="{ width: `${progress.percent}%` }" />
            <div v-else class="ext-indeterminate h-full w-1/3 rounded-full bg-blue-600" />
          </div>
        </div>
        <div
          v-else-if="item.state === 'failed'"
          class="mt-3 flex max-w-2xl items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800"
          role="alert"
          :data-testid="`extension-failed-${item.id}`"
        >
          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 6.5v4M10 13.5v.01" stroke-linecap="round" /></svg>
          <span lang="en">{{ item.failureMessage }}</span>
        </div>
        <p
          v-else-if="installed && shownMessage"
          class="mt-3 flex items-center gap-2 text-sm"
          :class="item.enabled && !item.ready && !item.starting ? 'text-amber-800' : 'text-gray-500'"
          :data-testid="`extension-message-${item.id}`"
          aria-live="polite"
        >
          <!-- start() is running (REQ-012): Voice Input loads its speech model; dictation is not blocked -->
          <span v-if="item.starting" class="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500 motion-reduce:animate-none" aria-hidden="true" :data-testid="`extension-starting-${item.id}`" />
          <span lang="en">{{ shownMessage }}</span>
        </p>
      </div>

      <!-- the one action of this state -->
      <div class="col-start-2 row-start-1 flex flex-shrink-0 flex-wrap items-center justify-end gap-3">
        <button
          v-if="item.state === 'notInstalled' || item.state === 'failed'"
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy || !canInstall"
          :data-testid="item.state === 'failed' ? `extension-reinstall-${item.id}` : `extension-install-${item.id}`"
          @click="store.install(item.id)"
        >{{ item.state === 'failed' ? t('extensions.card.installAgain') : t('extensions.card.install') }}</button>
        <template v-else-if="installed">
          <button
            v-if="item.update === 'available'"
            type="button"
            class="hidden rounded-md border border-blue-200 bg-white px-3.5 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 sm:inline-flex"
            :disabled="busy || !canInstall"
            :data-testid="`extension-update-${item.id}`"
            @click="store.update(item.id)"
          >{{ t('extensions.card.update', { version: item.catalogVersion ?? '' }) }}</button>
          <button
            type="button"
            role="switch"
            class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
            :class="item.enabled ? 'bg-blue-600' : 'bg-slate-300'"
            :aria-checked="item.enabled === true"
            :aria-label="t('extensions.card.switchLabel', { name: shown.name })"
            :disabled="busy"
            :data-testid="`extension-switch-${item.id}`"
            @click="store.setEnabled(item.id, !item.enabled)"
          >
            <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none" :class="item.enabled ? 'translate-x-5' : 'translate-x-0.5'" />
          </button>
        </template>
      </div>
    </div>

    <!-- the extension's page, its log and Remove -->
    <div v-if="(installed || item.state === 'failed') && !removing" class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
      <button
        v-if="installed"
        type="button"
        class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-expanded="open"
        :aria-controls="`extension-body-${item.id}`"
        :data-testid="`extension-toggle-page-${item.id}`"
        @click="store.togglePage(item.id)"
      >
        <svg class="h-4 w-4 text-gray-400 transition-transform motion-reduce:transition-none" :class="open ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {{ open ? t('extensions.card.hideSettings') : t('extensions.card.showSettings') }}
      </button>
      <span v-else />
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :data-testid="`extension-log-${item.id}`"
          @click="store.showLog(item.id)"
        >{{ t('extensions.card.viewLog') }}</button>
        <button
          type="button"
          class="rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60"
          :disabled="busy"
          :data-testid="`extension-remove-${item.id}`"
          @click="store.removeFor = item.id"
        >{{ t('extensions.card.remove') }}</button>
      </div>
    </div>

    <div v-if="open && installed && !removing" :id="`extension-body-${item.id}`" class="border-t border-gray-100 px-5 py-5">
      <ExtensionPageFrame :extension-id="item.id" :title="t('extensions.page.title', { name: shown.name })" />
      <slot name="after-page" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ExtensionPageFrame from '~/components/settings/extensions/ExtensionPageFrame.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useExtensionsStore } from '~/stores/extensionsStore';
import { extensionTextOf, type ExtensionItem } from '~/types/extensions';

/**
 * The common card AutoByteus draws for every extension (DEC-014): name, version, state, the action of the state,
 * View log, Remove, and the extension's own page in place below its footer.
 */
const props = defineProps<{ item: ExtensionItem; platform: string; canInstall: boolean }>();
const { t, resolvedLocale } = useLocalization();
const store = useExtensionsStore();

/** A status that only says it is ready is not repeated under the pill. */
const READY_MESSAGE = 'Ready.';

const shown = computed(() => extensionTextOf(props.item, String(resolvedLocale.value ?? 'en')));
const installed = computed(() => props.item.state === 'installed');
const removing = computed(() => store.pending[props.item.id] === 'remove');
const busy = computed(() => Boolean(store.pending[props.item.id]));
const open = computed(() => Boolean(store.openPages[props.item.id]));
const shownVersion = computed(() => props.item.installedVersion ?? props.item.catalogVersion);
const progress = computed(() => (removing.value
  ? { message: t('extensions.state.removing'), percent: null }
  : props.item.state === 'installing' || props.item.state === 'updating' ? props.item.progress : null));
const shownMessage = computed(() => {
  const message = props.item.message && props.item.message !== READY_MESSAGE ? props.item.message : '';
  return store.justInstalled[props.item.id] && props.item.starting ? `${t('extensions.card.installedAndOn')} ${message}`.trim() : message;
});

const PLATFORM_KEYS: Record<string, string> = {
  'darwin-arm64': 'macAppleSilicon', 'darwin-x64': 'macIntel', 'linux-x64': 'linuxX64', 'linux-arm64': 'linuxArm', 'win32-x64': 'windowsX64',
};
const platformLabel = (platform: string) => (PLATFORM_KEYS[platform] ? t(`extensions.platform.${PLATFORM_KEYS[platform]}`) : platform);

const pill = computed<{ label: string; class: string; dot?: string }>(() => {
  const item = props.item;
  if (removing.value) return { label: t('extensions.state.removing'), class: 'bg-blue-50 text-blue-700' };
  switch (item.state) {
    case 'notAvailableHere':
      return { label: item.notAvailableReason === 'newerAutoByteus' ? t('extensions.state.needsNewerApp') : t('extensions.state.notAvailable'), class: 'bg-gray-100 text-gray-600' };
    case 'notInstalled': return { label: t('extensions.state.notInstalled'), class: 'bg-gray-100 text-gray-700' };
    case 'installing': return { label: t('extensions.state.installing'), class: 'bg-blue-50 text-blue-700' };
    case 'updating': return { label: t('extensions.state.updating'), class: 'bg-blue-50 text-blue-700' };
    case 'failed': return { label: t('extensions.state.failed'), class: 'bg-red-50 text-red-700', dot: 'bg-red-500' };
    case 'installed':
      if (!item.enabled) return { label: t('extensions.state.off'), class: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
      if (!item.ready) return { label: t('extensions.state.notReady'), class: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' };
      return { label: t('extensions.state.on'), class: 'bg-green-50 text-green-700', dot: 'bg-green-500' };
  }
  return { label: '', class: '' };
});
</script>

<style scoped>
.ext-indeterminate { animation: ext-slide 1.4s ease-in-out infinite; }
@keyframes ext-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
@media (prefers-reduced-motion: reduce) { .ext-indeterminate { animation: none; width: 100%; opacity: 0.35; } }
</style>
