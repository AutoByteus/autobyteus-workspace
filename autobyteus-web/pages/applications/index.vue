<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-semibold text-slate-900">{{ $t('applications.pages.applications.index.title') }}</h1>
          <p class="mt-1 text-sm text-slate-600">
            {{ $t('applications.pages.applications.index.description') }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center self-start rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          :disabled="loading"
          @click="refreshApplications"
        >
          {{ loading
            ? $t('applications.pages.applications.index.refreshingCatalog')
            : $t('applications.pages.applications.index.refreshCatalog') }}
        </button>
      </header>

      <div
        v-if="!applicationStore.isApplicationsEnabled()"
        class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
      >
        {{ $t('applications.pages.applications.index.applicationsDisabled') }}
      </div>

      <div v-else-if="loading && applications.length === 0" class="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">{{ $t('applications.pages.applications.index.loadingApplications') }}</p>
      </div>

      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p class="font-semibold">{{ $t('applications.pages.applications.index.unableToLoadApplications') }}</p>
        <p class="mt-1">{{ error.message }}</p>
      </div>

      <div v-else-if="applications.length === 0" class="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">{{ $t('applications.pages.applications.index.noApplicationsFound') }}</h2>
        <p class="mt-2 text-sm text-slate-500">
          {{ $t('applications.pages.applications.index.emptyStateHelp') }}
        </p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ApplicationCard
          v-for="application in applications"
          :key="application.id"
          :application="application"
          :active-session-id="applicationSessionStore.getCachedActiveSessionByApplicationId(application.id)?.applicationSessionId ?? null"
          @open="openApplication"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import ApplicationCard from '~/components/applications/ApplicationCard.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useApplicationSessionStore } from '~/stores/applicationSessionStore'
import { useApplicationStore } from '~/stores/applicationStore'

const { t: $t } = useLocalization()
const applicationStore = useApplicationStore()
const applicationSessionStore = useApplicationSessionStore()
const { applications, loading, error } = storeToRefs(applicationStore)

onMounted(() => {
  void applicationStore.fetchApplications()
})

const refreshApplications = async (): Promise<void> => {
  await applicationStore.fetchApplications(true)
}

const openApplication = async (applicationId: string): Promise<void> => {
  await navigateTo(`/applications/${encodeURIComponent(applicationId)}`)
}
</script>
