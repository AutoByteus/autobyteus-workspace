<template>
  <!-- The run list's ⋮ (autobyteus-525 DEC-001): the menu of the phone's own preferences; "On this phone" is only its
       accessible name (autobyteus-534 DEC-002). Text size is its first group, with its own header; a later Language
       group joins below it with its own header (autobyteus-509). A step applies at once to every phone screen and the
       menu stays open so the change can be seen. The buttons keep 44 px tap targets at every step. -->
  <div class="relative flex-shrink-0">
    <button
      ref="buttonRef"
      type="button"
      class="flex h-12 min-h-[44px] w-12 min-w-[44px] items-center justify-center rounded-full text-slate-600 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :aria-label="t('mobile.onThisPhone.title')"
      aria-haspopup="menu"
      :aria-expanded="open"
      data-testid="mobile-on-this-phone-button"
      @click="open = !open"
    >
      <svg viewBox="0 0 20 20" class="h-6 w-6" fill="currentColor" aria-hidden="true"><circle cx="10" cy="4" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="10" cy="16" r="1.6" /></svg>
    </button>
    <template v-if="open">
      <button type="button" class="fixed inset-0 z-20 cursor-default" tabindex="-1" :aria-label="t('mobile.onThisPhone.close')" @click="open = false" />
      <div
        class="absolute right-0 top-12 z-30 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        role="menu"
        :aria-label="t('mobile.onThisPhone.title')"
        data-testid="mobile-on-this-phone-menu"
        @keydown.esc="close"
      >
        <div class="px-4 pb-3 pt-3" role="group" :aria-label="t('mobile.onThisPhone.textSize')" data-testid="mobile-text-size">
          <p class="mb-2 text-sm font-semibold text-slate-900" data-testid="mobile-text-size-header">{{ t('mobile.onThisPhone.textSize') }}</p>
          <div class="grid grid-cols-3 gap-1.5">
            <!-- Each "A" previews its own step in fixed px (autobyteus-525 REQ-006 exception). -->
            <button
              v-for="(entry, index) in PHONE_TEXT_SIZE_STEPS"
              :key="entry.step"
              type="button"
              class="flex h-11 min-h-[44px] items-center justify-center rounded-lg border font-medium leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="current === entry.step ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 active:bg-slate-100'"
              :style="{ fontSize: `${16 + index * 3}px` }"
              :aria-label="t(`mobile.onThisPhone.textSize.${entry.step}`)"
              :aria-pressed="current === entry.step"
              :data-testid="`mobile-text-size-${entry.step}`"
              @click="appFontSize.setPhoneTextSize(entry.step)"
            >A</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { PHONE_TEXT_SIZE_STEPS } from '~/display/fontSize/phoneTextSizeSteps';
import { useAppFontSizeStore } from '~/stores/appFontSizeStore';

const { t } = useLocalization();
const appFontSize = useAppFontSizeStore();
const current = computed(() => appFontSize.phoneTextSizeStep);
const open = ref(false);
const buttonRef = ref<HTMLButtonElement | null>(null);
// Opened: the focus goes to the chosen step.
watch(open, (value) => {
  if (value) void nextTick(() => document.querySelector<HTMLElement>('[data-testid="mobile-on-this-phone-menu"] [aria-pressed="true"]')?.focus());
});
const close = (): void => { open.value = false; buttonRef.value?.focus(); };
</script>
