<template>
  <div class="flex h-full min-w-0 flex-col bg-slate-50 md:flex-row" data-testid="projects-page">
    <ProjectListPane :selected-project-id="selectedProjectId" />
    <main class="min-h-0 min-w-0 flex-1 overflow-y-auto" data-testid="projects-page-content">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProjectListPane from '~/components/projects/ProjectListPane.vue'

// Two-pane Projects page: the Project list stays mounted while child routes swap the right pane.
const route = useRoute()
const selectedProjectId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
</script>
