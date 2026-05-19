<template>
  <section class="flex h-full flex-col overflow-hidden" data-testid="mobile-activity">
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Activity</p>
      <h2 class="text-xl font-bold text-slate-950">Task and team updates</h2>
      <p class="mt-1 text-sm text-slate-500">Right-panel information becomes cards and sheets on phone.</p>
    </header>

    <MobileActivityDigest :context="context" @choose-work="$emit('chooseWork')" />
  </section>
</template>

<script setup lang="ts">
import MobileActivityDigest from '~/components/mobile/MobileActivityDigest.vue';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
}>();
</script>
