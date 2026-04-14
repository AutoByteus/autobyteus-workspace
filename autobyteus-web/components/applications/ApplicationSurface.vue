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
    <h2 class="text-lg font-semibold text-slate-900">{{ $t('applications.components.applications.ApplicationSurface.noActiveSession') }}</h2>
    <p class="mt-2 text-sm">
      {{ $t('applications.components.applications.ApplicationSurface.noActiveSessionHelp') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'
import ApplicationIframeHost from '~/components/applications/ApplicationIframeHost.vue'
import type { ApplicationSession } from '~/types/application/ApplicationSession'

const { t: $t } = useLocalization()

defineProps<{
  session: ApplicationSession | null
}>()
</script>
