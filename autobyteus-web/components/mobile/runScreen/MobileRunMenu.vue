<template>
  <!-- The ⋮ menu (UIS-003, VIS-006, 026): the open agent's views; Messages only for a member of a Team or Org; VNC Viewer
       only when the paired node has a node desktop and the run is on that node (autobyteus-407); Settings for every run
       (autobyteus-458, autobyteus-522); below them the phone-wide Text size (autobyteus-506). -->
  <div class="relative flex-shrink-0">
    <button
      ref="buttonRef"
      type="button"
      class="flex h-12 w-12 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label="More"
      aria-haspopup="menu"
      :aria-expanded="open"
      data-testid="mobile-run-menu-button"
      @click="open = !open"
    >
      <svg viewBox="0 0 20 20" class="h-6 w-6" fill="currentColor" aria-hidden="true"><circle cx="10" cy="4" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="10" cy="16" r="1.6" /></svg>
    </button>
    <template v-if="open">
      <button type="button" class="fixed inset-0 z-20 cursor-default" tabindex="-1" aria-label="Close menu" @click="open = false" />
      <div class="absolute right-1 top-12 z-30 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg" role="menu" data-testid="mobile-run-menu" @keydown.esc="close">
        <button
          v-for="view in views"
          :key="view.id"
          type="button"
          role="menuitem"
          class="flex h-12 w-full items-center gap-3 px-4 text-left text-[0.9375rem] text-slate-800 active:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
          :data-testid="`mobile-run-menu-${view.id}`"
          @click="choose(view.id)"
        >
          <Icon :icon="view.icon" class="h-5 w-5 text-slate-500" aria-hidden="true" />
          {{ view.label }}
        </button>
        <div class="mt-1 border-t border-slate-200 px-4 pb-2 pt-3" role="group" :aria-label="t('mobile.settings.textSize')" data-testid="mobile-text-size">
          <p class="mb-2 text-xs font-medium text-slate-500">{{ t('mobile.settings.textSize') }}</p>
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="(entry, index) in PHONE_TEXT_SIZE_STEPS"
              :key="entry.step"
              type="button"
              class="flex h-11 items-center justify-center rounded-lg border font-medium leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="textSize.step.value === entry.step ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 active:bg-slate-100'"
              :style="{ fontSize: `${13 + index * 3}px` }"
              :aria-label="t(`mobile.settings.textSize.${entry.step}`)"
              :aria-pressed="textSize.step.value === entry.step"
              :data-testid="`mobile-text-size-${entry.step}`"
              @click="textSize.set(entry.step)"
            >A</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import type { MobileView } from '~/composables/mobile/useMobileNavigation';
import { PHONE_TEXT_SIZE_STEPS, usePhoneTextSize } from '~/composables/mobile/usePhoneTextSize';
import { useLocalization } from '~/composables/useLocalization';

const props = defineProps<{ showMessages: boolean; showDesktop: boolean }>();
const emit = defineEmits<{ (event: 'open-view', view: MobileView): void }>();

const VIEWS: readonly { id: MobileView; label: string; icon: string }[] = [
  { id: 'artifacts', label: 'Artifacts', icon: 'heroicons:document-text-20-solid' },
  { id: 'files', label: 'Files', icon: 'heroicons:folder-20-solid' },
  { id: 'messages', label: 'Messages', icon: 'heroicons:chat-bubble-left-20-solid' },
  { id: 'activity', label: 'Activity', icon: 'heroicons:bolt-20-solid' },
  { id: 'desktop', label: 'VNC Viewer', icon: 'heroicons:computer-desktop-20-solid' },
];
const { t } = useLocalization();
const textSize = usePhoneTextSize();
/** Artifacts, Files, Messages, Activity, Settings, VNC Viewer: Messages and VNC Viewer when they apply; Settings for every
 *  run (autobyteus-522). */
const views = computed(() => VIEWS.flatMap((view) => {
  if ((view.id === 'messages' && !props.showMessages) || (view.id === 'desktop' && !props.showDesktop)) return [];
  if (view.id !== 'activity') return [view];
  return [view, { id: 'settings' as const, label: t('mobile.settings.menuEntry'), icon: 'heroicons:cog-6-tooth-20-solid' }];
}));
const open = ref(false);
const buttonRef = ref<HTMLButtonElement | null>(null);
watch(open, (value) => { if (value) void nextTick(() => document.querySelector<HTMLElement>('[data-testid="mobile-run-menu"] [role="menuitem"]')?.focus()); });
const close = (): void => { open.value = false; buttonRef.value?.focus(); };
const choose = (view: MobileView): void => { open.value = false; emit('open-view', view); };
</script>
