<template>
  <!-- An attachment's thumbnail (a sent message's or the composer's draft), loaded with the node key where one is needed
       (the phone, autobyteus-450). Its caller gives the classes. -->
  <img
    v-if="resolvedUrl"
    :src="resolvedUrl"
    :alt="alt"
    @error="$emit('failed')"
  />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useAuthorizedObjectUrl } from '~/composables/useAuthorizedObjectUrl';

const props = defineProps<{ url: string; alt: string }>();
const emit = defineEmits<{ failed: [] }>();

const { resolvedUrl, error } = useAuthorizedObjectUrl(() => props.url);
// A refused or failed load shows the attachment as its name, as a broken image does.
watch(error, (value) => { if (value) emit('failed'); }, { immediate: true });
</script>
