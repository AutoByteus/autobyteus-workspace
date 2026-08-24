<template>
  <MobileRemoteAccessShell />
</template>

<script setup lang="ts">
import MobileRemoteAccessShell from '~/components/mobile/MobileRemoteAccessShell.vue';

definePageMeta({
  layout: false,
});

useHead({
  title: 'AutoByteus Mobile',
  link: [
    { rel: 'manifest', href: '/mobile.webmanifest' },
    { rel: 'icon', type: 'image/svg+xml', href: '/autobyteus-icon.svg' },
    { rel: 'apple-touch-icon', href: '/icons/autobyteus-mobile-192.png' },
  ],
  meta: [
    { name: 'theme-color', content: '#1E3A8A' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'AutoByteus' },
  ],
});
</script>
