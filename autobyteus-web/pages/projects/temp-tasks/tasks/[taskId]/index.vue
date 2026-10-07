<template><TempTaskDetail :key="taskId" :task-id="taskId" /></template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TempTaskDetail from '~/components/projects/TempTaskDetail.vue'

const route = useRoute()
const taskId = computed(() => String(route.params.taskId))
</script>
