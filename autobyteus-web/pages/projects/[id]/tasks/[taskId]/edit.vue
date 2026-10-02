<template><div class="h-full flex-1 overflow-auto bg-slate-50"><ProjectTaskEditor :project-id="String(route.params.id)" :task-id="String(route.params.taskId)" :key="JSON.stringify([route.params.id, route.params.taskId])" /></div></template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import ProjectTaskEditor from '~/components/projects/ProjectTaskEditor.vue'
const route = useRoute()
</script>
