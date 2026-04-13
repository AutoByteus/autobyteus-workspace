<template>
  <div
    v-if="session"
    class="h-[calc(100vh-24rem)] min-h-[32rem]"
  >
    <ApplicationIframeHost :application-session-id="session.applicationSessionId" />
  </div>

  <div
    v-else
    class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600 shadow-sm"
  >
    <h2 class="text-lg font-semibold text-slate-900">No active application session</h2>
    <p class="mt-2 text-sm">
      Launch this application to create the backend-owned session and bootstrap the bundled application UI.
    </p>
  </div>
</template>

<script setup lang="ts">
import ApplicationIframeHost from '~/components/applications/ApplicationIframeHost.vue'
import type { ApplicationSession } from '~/types/application/ApplicationSession'

defineProps<{
  session: ApplicationSession | null
}>()
</script>
