<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="nfs-guide-card">
    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{{ t('settings.components.settings.NfsGuideCard.eyebrow') }}</p>
    <h3 class="mt-1 text-base font-semibold text-slate-950">{{ t('settings.components.settings.NfsGuideCard.title') }}</h3>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{{ t('settings.components.settings.NfsGuideCard.description') }}</p>

    <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h4 class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.NfsGuideCard.firstUse') }}</h4>
      <p class="mt-1 text-sm leading-6 text-slate-600">{{ t('settings.components.settings.NfsGuideCard.computerHint') }}</p>
      <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div v-for="computer in computers" :key="computer.id" class="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h5 class="text-sm font-semibold text-slate-900">{{ t(computer.labelKey) }}</h5>
              <p class="mt-1 text-xs leading-5 text-slate-500">{{ t(computer.detailKey) }}</p>
            </div>
            <button type="button" :disabled="!computer.command || copying !== null"
              class="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
              :aria-label="t('settings.components.settings.NfsGuideCard.copyAria', { computer: t(computer.labelKey) })"
              :aria-describedby="computer.command ? undefined : 'nfs-release-unavailable'" :data-testid="`copy-nfs-${computer.id}`" @click="copy(computer.id, computer.command)">
              {{ t(copied === computer.id ? 'settings.components.settings.NfsGuideCard.copied' : 'settings.components.settings.NfsGuideCard.copy') }}
            </button>
          </div>
          <pre v-if="computer.command" class="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-700"><code>{{ computer.command }}</code></pre>
          <p v-else class="mt-3 text-sm text-slate-500">{{ t('settings.components.settings.NfsGuideCard.notPublished') }}</p>
        </div>
      </div>
      <p v-if="!allAvailable" id="nfs-release-unavailable" class="mt-3 text-sm leading-6 text-slate-600">{{ t('settings.components.settings.NfsGuideCard.unavailable') }}</p>
      <a v-if="downloadUrl" :href="downloadUrl" target="_blank" rel="noopener noreferrer" class="mt-3 inline-block text-sm font-semibold text-blue-700 underline underline-offset-4">{{ t('settings.components.settings.NfsGuideCard.download') }}</a>
      <p role="status" aria-live="polite" class="mt-2 text-sm" :class="copyError ? 'text-red-700' : 'text-emerald-700'" data-testid="nfs-copy-feedback">{{ feedback }}</p>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div><h4 class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.NfsGuideCard.createTitle') }}</h4><p class="mt-1 text-sm leading-6 text-slate-600">{{ t('settings.components.settings.NfsGuideCard.createDetail') }}</p></div>
      <div><h4 class="text-sm font-semibold text-slate-900">{{ t('settings.components.settings.NfsGuideCard.connectTitle') }}</h4><p class="mt-1 text-sm leading-6 text-slate-600">{{ t('settings.components.settings.NfsGuideCard.connectDetail') }}</p></div>
    </div>
    <p class="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">{{ t('settings.components.settings.NfsGuideCard.workspaceHint') }}</p>
    <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
      <p class="font-semibold">{{ t('settings.components.settings.NfsGuideCard.trustTitle') }}</p>
      <p class="mt-1">{{ t('settings.components.settings.NfsGuideCard.trustDetail') }}</p>
      <p class="mt-2">{{ t('settings.components.settings.NfsGuideCard.outageDetail') }}</p>
    </div>
    <p class="mt-4 text-xs leading-5 text-slate-500">{{ t('settings.components.settings.NfsGuideCard.limitations') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { nfsLauncherCommand, type NfsPublishedRelease, type NfsComputer } from '~/utils/nfsLauncherCommands';
const props = defineProps<{ release: NfsPublishedRelease | null }>();
const { t } = useLocalization();
const computers = computed(() => (['macos', 'linux'] as const).map(id => ({ id,
  labelKey: `settings.components.settings.NfsGuideCard.${id}` as const,
  detailKey: `settings.components.settings.NfsGuideCard.${id}Detail` as const,
  command: nfsLauncherCommand(id, props.release),
})));
const allAvailable = computed(() => computers.value.every(computer => computer.command));
const downloadUrl = computed(() => computers.value.some(computer => computer.command) ? props.release?.downloadUrl : null);
const copying = ref<NfsComputer | null>(null), copied = ref<NfsComputer | null>(null), copyError = ref(false);
const feedback = computed(() => copyError.value ? t('settings.components.settings.NfsGuideCard.copyFailed') : copied.value ? t('settings.components.settings.NfsGuideCard.copiedHint') : '');
let resetTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
onBeforeUnmount(() => { disposed = true; clearTimeout(resetTimer); });
async function copy(computer: NfsComputer, command: string | null) {
  if (!command || copying.value) return;
  copying.value = computer; copyError.value = false; copied.value = null;
  clearTimeout(resetTimer);
  try {
    await navigator.clipboard.writeText(command);
    if (disposed) return;
    copied.value = computer;
    resetTimer = setTimeout(() => { copied.value = null; }, 2000);
  } catch { if (!disposed) copyError.value = true; }
  finally { if (!disposed) copying.value = null; }
}
</script>
