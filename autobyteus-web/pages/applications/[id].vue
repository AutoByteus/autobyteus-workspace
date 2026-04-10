<template>
  <div class="flex w-full h-full bg-white font-sans">
    <!-- STEP 2: INTERACTION UI -->
    <div v-if="applicationRunId" class="w-full h-full">
       <Suspense>
          <template #default>
            <!-- This is hardcoded for now, a more robust solution would dynamically import the correct component based on appId -->
            <SocraticMathTeacherApp :application-run-id="applicationRunId" @reset="handleReset" />
          </template>
          <template #fallback>
            <div class="h-full flex flex-col items-center justify-center text-gray-500">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p class="mt-4 font-semibold">{{ $t('applications.pages.applications.detail.loading_interface') }}</p>
            </div>
          </template>
        </Suspense>
    </div>

    <!-- Fallback if no applicationRunId is provided -->
    <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-600">
        <h1 class="text-2xl font-bold">{{ $t('applications.pages.applications.detail.no_active_session') }}</h1>
        <p class="mt-2">{{ $t('applications.pages.applications.detail.launch_from_main_page') }}</p>
        <button @click="goBack" class="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            {{ $t('applications.pages.applications.detail.go_to_applications') }}
        </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApplicationContextStore } from '~/stores/applicationContextStore';

// This is hardcoded for now. A more robust solution would dynamically import the correct component.
const SocraticMathTeacherApp = defineAsyncComponent(() => import(`~/applications/socratic_math_teacher/index.vue`));

const route = useRoute();
const router = useRouter();
const appContextStore = useApplicationContextStore();

const applicationRunId = ref<string | null>(null);

onMounted(() => {
  const idFromQuery = route.query.applicationRunId as string;
  if (idFromQuery) {
    // Verify that the run context exists in the store. This is crucial for session restoration.
    if (appContextStore.getRun(idFromQuery)) {
        applicationRunId.value = idFromQuery;
        // Set it as the active run so the UI components can find it.
        appContextStore.setActiveRun(idFromQuery);
    } else {
        // If the applicationRunId is in the URL but not in the store (e.g., after a page refresh in a new tab),
        // we can't continue. For now, we'll show the fallback message.
        // A more advanced implementation could attempt to restore state from a backend.
        console.warn(`Application run ID ${idFromQuery} found in URL but not in store. Cannot restore session.`);
        applicationRunId.value = null;
    }
  }
});

function handleReset() {
  // The onUnmounted hook in the child component handles backend termination.
  // We just need to navigate back to the main list.
  router.push('/applications');
}

function goBack() {
    router.push('/applications');
}
</script>
