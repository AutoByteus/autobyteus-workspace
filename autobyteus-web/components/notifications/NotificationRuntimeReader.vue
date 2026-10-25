<template>
  <!-- Renders nothing. While the panel shows agent runtime rows, it reads the runtimes as Settings → Agent Runtimes
       does (running agents, a running or failed update) without starting a check, and lends them to the rows. -->
  <span hidden />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useAgentRuntimes } from '~/composables/settings/useAgentRuntimes'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'

const notifications = useUpdateNotificationsStore()
const state = useAgentRuntimes({ checkOnRebind: false })

onMounted(() => {
  notifications.attachRuntimeStatuses({ runtimes: state.runtimes, update: state.update })
  void state.refresh()
})
onBeforeUnmount(() => notifications.attachRuntimeStatuses(null))
</script>
