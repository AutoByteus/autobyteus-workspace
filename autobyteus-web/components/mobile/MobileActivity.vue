<template>
  <section class="flex h-full flex-col overflow-hidden" data-testid="mobile-activity">
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
