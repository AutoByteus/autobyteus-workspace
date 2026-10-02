<template><div class="h-full flex-1 overflow-auto bg-slate-50"><ProjectEditor :project-id="String(route.params.id)" :key="String(route.params.id)" /></div></template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import ProjectEditor from '~/components/projects/ProjectEditor.vue'
const route = useRoute()
</script>
