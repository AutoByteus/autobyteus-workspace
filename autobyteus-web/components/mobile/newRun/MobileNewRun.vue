<template>
  <!-- New run (UIS-008, VIS-015, 028): an agent run only (DEC-007). -->
  <section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-new-run">
    <header class="flex h-14 flex-shrink-0 items-center border-b border-slate-200 pl-1 pr-3">
      <button type="button" class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Close" data-testid="mobile-new-run-close" @click="$emit('close')">
        <Icon icon="heroicons:x-mark-20-solid" class="h-6 w-6" aria-hidden="true" />
      </button>
      <h1 class="px-2 text-base font-semibold">New run</h1>
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <MobileRunSetup @launched="$emit('launched', $event)" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import MobileRunSetup from '~/components/mobile/newRun/MobileRunSetup.vue';

defineEmits<{ (event: 'close'): void; (event: 'launched', runId: string): void }>();
</script>
