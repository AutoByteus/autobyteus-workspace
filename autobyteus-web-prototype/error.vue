<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError
})

const isDev = import.meta.dev
</script>

<template>
  <div class="p-6 font-sans">
    <h1 class="text-xl font-bold">Error {{ error?.statusCode }}</h1>
    <p class="mt-2 text-gray-700">{{ error?.message }}</p>

    <pre
      v-if="isDev && (error as any)?.stack"
      class="mt-4 p-3 bg-gray-100 border border-gray-200 rounded text-xs overflow-auto whitespace-pre-wrap"
    >{{ (error as any)?.stack }}</pre>

    <NuxtLink to="/" class="mt-4 inline-block text-blue-600 hover:underline">Go back home</NuxtLink>
  </div>
</template>
