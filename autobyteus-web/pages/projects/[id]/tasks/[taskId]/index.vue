<template><div class="h-full flex-1 overflow-auto bg-slate-50"><ProjectTaskDetail :project-id="String(route.params.id)" :task-id="String(route.params.taskId)" :key="JSON.stringify([route.params.id, route.params.taskId])" /></div></template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import ProjectTaskDetail from '~/components/projects/ProjectTaskDetail.vue'
const route = useRoute()
</script>
