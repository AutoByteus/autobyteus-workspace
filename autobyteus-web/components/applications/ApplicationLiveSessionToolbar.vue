<template>
  <header class="border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            @click="$emit('back')"
          >
            {{ $t('applications.components.applications.ApplicationShell.backToApplications') }}
          </button>
          <h1 class="truncate text-2xl font-semibold tracking-tight text-slate-900">
            {{ applicationName }}
          </h1>
          <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {{ $t('applications.shared.sessionActive') }}
          </span>
        </div>
        <p class="mt-2 text-sm text-slate-500">
          {{ $t('applications.components.applications.ApplicationShell.singleLiveSessionNotice') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="pageMode === 'application'
            ? 'bg-blue-600 text-white'
            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
          @click="$emit('set-mode', 'application')"
        >
          {{ $t('applications.components.applications.ApplicationShell.tabApplication') }}
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="pageMode === 'execution'
            ? 'bg-blue-600 text-white'
            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
          @click="$emit('set-mode', 'execution')"
        >
          {{ $t('applications.components.applications.ApplicationShell.tabExecution') }}
        </button>
        <button
          v-if="pageMode === 'application' && applicationPresentation === 'standard'"
          type="button"
          class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          data-testid="application-enter-immersive"
          @click="$emit('enter-immersive')"
        >
          {{ $t('applications.components.applications.ApplicationShell.enterImmersive') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          data-testid="application-details-toggle"
          @click="$emit('toggle-details')"
        >
          {{ detailsOpen
            ? $t('applications.components.applications.ApplicationShell.hideDetails')
            : $t('applications.components.applications.ApplicationShell.showDetails') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          @click="$emit('relaunch')"
        >
          {{ $t('applications.components.applications.ApplicationShell.launchAgain') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          @click="$emit('stop-session')"
        >
          {{ $t('applications.components.applications.ApplicationShell.stopSession') }}
        </button>
      </div>
    </div>

    <div
      v-if="bindingNotice"
      class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    >
      {{ bindingNotice }}
    </div>

    <div
      v-if="detailsOpen"
      class="mt-3 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div v-for="item in detailItems" :key="item.label">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ item.label }}</p>
        <p class="mt-1 break-all">{{ item.value }}</p>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'
import type { ApplicationSurfacePresentation } from '~/types/application/ApplicationSurfacePresentation'
import type { ApplicationPageMode } from '~/stores/applicationPageStore'

defineProps<{
  applicationName: string
  pageMode: ApplicationPageMode
  applicationPresentation: ApplicationSurfacePresentation
  detailsOpen: boolean
  bindingNotice: string | null
  detailItems: Array<{
    label: string
    value: string
  }>
}>()

defineEmits<{
  (event: 'back'): void
  (event: 'set-mode', mode: ApplicationPageMode): void
  (event: 'enter-immersive'): void
  (event: 'toggle-details'): void
  (event: 'relaunch'): void
  (event: 'stop-session'): void
}>()

const { t: $t } = useLocalization()
</script>
