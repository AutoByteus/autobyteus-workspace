<template>
  <ProjectDetail :project-id="projectId" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProjectDetail from '~/components/projects/ProjectDetail.vue'

const route = useRoute()
const projectId = computed(() => String(route.params.id ?? ''))
</script>
