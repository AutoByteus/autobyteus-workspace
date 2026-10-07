<template>
  <section class="p-6" data-testid="navigation-probe-ready">
    <h1>Primary navigation regression fixture</h1>
    <button data-testid="toggle-applications" @click="toggleApplications">Toggle Applications</button>
  </section>
</template>
<script setup lang="ts">
// Fixture inputs only: production default layout, navigation consumers and router remain real.
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'
const applications = useApplicationsCapabilityStore()
applications.$patch({ status: 'resolved', capability: { enabled: true, settingKey: 'ENABLE_APPLICATIONS', source: 'SERVER_SETTING', scope: 'BOUND_NODE' } })
const toggleApplications = () => applications.$patch({ capability: { ...applications.capability!, enabled: !applications.isEnabled } })
</script>
