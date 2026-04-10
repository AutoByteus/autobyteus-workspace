<template>
  <div class="flex h-full bg-white font-sans">
    <div class="flex-1 overflow-auto p-8">
      <div class="max-w-full mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">{{ $t('applications.pages.applications.index.title') }}</h1>
          <p class="text-gray-500 mt-1">{{ $t('applications.pages.applications.index.explore_and_run_available_applications') }}</p>
        </div>

        <div v-if="loading" class="text-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p>{{ $t('applications.pages.applications.index.loading_applications') }}</p>
        </div>
        <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-md p-4">
          <p class="font-bold">{{ $t('applications.pages.applications.index.error_loading_applications') }}</p>
          <p>{{ error.message }}</p>
        </div>
        <div v-else-if="applications.length > 0" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <ApplicationCard
            v-for="app in applications"
            :key="app.id"
            :application="app"
            @launch="handleLaunchRequest"
          />
        </div>
        <div v-else class="text-center bg-gray-50 rounded-lg py-12 px-6 border border-gray-200">
           <h3 class="text-lg font-medium text-gray-900">{{ $t('applications.pages.applications.index.no_applications_found') }}</h3>
           <p class="mt-1 text-sm text-gray-500">{{ $t('applications.pages.applications.index.there_are_no_applications_available_at') }}</p>
        </div>
      </div>
    </div>
    
    <!-- Launch Configuration Modal -->
    <ApplicationLaunchConfigModal
        :show="showLaunchModal"
        :application="appToLaunch"
        @close="showLaunchModal = false"
        @success="onLaunchSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useApplicationStore, type ApplicationManifest } from '~/stores/applicationStore';
import ApplicationCard from '~/components/applications/ApplicationCard.vue';
import ApplicationLaunchConfigModal from '~/components/applications/ApplicationLaunchConfigModal.vue';

const applicationStore = useApplicationStore();
const router = useRouter();

// Use storeToRefs to maintain reactivity for state properties when destructuring.
const { applications, loading, error } = storeToRefs(applicationStore);

// State for the launch modal
const showLaunchModal = ref(false);
const appToLaunch = ref<ApplicationManifest | null>(null);

// Fetch applications when the component is mounted.
onMounted(() => {
  applicationStore.fetchApplications();
});

function handleLaunchRequest(app: ApplicationManifest) {
    appToLaunch.value = app;
    showLaunchModal.value = true;
}

function onLaunchSuccess(payload: { appId: string, applicationRunId: string }) {
    showLaunchModal.value = false;
    router.push(`/applications/${payload.appId}?applicationRunId=${payload.applicationRunId}`);
}
</script>
