<template><div class="h-full flex-1 overflow-auto bg-slate-50"><ProjectTaskEditor :project-id="String(route.params.id)" :key="String(route.params.id)" /></div></template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import ProjectTaskEditor from '~/components/projects/ProjectTaskEditor.vue'
const route = useRoute()
</script>
