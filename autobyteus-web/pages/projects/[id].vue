<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <ProjectDetail :project-id="projectId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProjectDetail from '~/components/projects/ProjectDetail.vue'

const route = useRoute()
const projectId = computed(() => String(route.params.id ?? ''))
</script>
