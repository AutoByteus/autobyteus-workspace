<template>
  <!-- The phone's bottom sheet (UIS-009, UIS-010): a 40% backdrop, the handle, a 56px header (the title and Close), the
       body as tall as its content up to 85% of the screen, and an optional footer. -->
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex flex-col justify-end" :data-testid="testId" @keydown.esc="$emit('close')">
      <button type="button" class="absolute inset-0 bg-slate-900/40" tabindex="-1" aria-label="Close" @click="$emit('close')" />
      <div ref="dialogRef" class="relative flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-xl focus:outline-none" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
        <div class="mx-auto mt-2 h-1 w-10 flex-shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
        <header class="flex min-h-[3.5rem] flex-shrink-0 items-center justify-between gap-3 pl-4 pr-2">
          <slot name="header" :title-id="titleId">
            <h2 :id="titleId" class="min-w-0 truncate text-lg font-semibold text-slate-900">{{ title }}</h2>
          </slot>
          <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Close" data-testid="mobile-sheet-close" @click="$emit('close')">
            <Icon icon="heroicons:x-mark-20-solid" class="h-6 w-6" aria-hidden="true" />
          </button>
        </header>
        <slot name="top" />
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain" :class="$slots.footer ? 'pb-2' : 'pb-[max(1rem,env(safe-area-inset-bottom))]'">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex-shrink-0 border-t border-slate-200 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { Icon } from '@iconify/vue';

withDefaults(defineProps<{ title?: string; testId?: string }>(), { title: '', testId: 'mobile-bottom-sheet' });
defineEmits<{ (event: 'close'): void }>();

const titleId = `mobile-sheet-title-${useId()}`;
const dialogRef = ref<HTMLElement | null>(null);
// Opening moves focus into the sheet; closing returns it to the control that opened it.
const opener = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null;
onMounted(() => { void nextTick(() => (dialogRef.value?.querySelector<HTMLElement>('[data-autofocus]') ?? dialogRef.value)?.focus()); });
onBeforeUnmount(() => { opener?.focus?.(); });
</script>
