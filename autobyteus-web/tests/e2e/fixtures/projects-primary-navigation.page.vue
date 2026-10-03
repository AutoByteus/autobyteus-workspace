<template>
  <section class="p-6" data-testid="navigation-probe-ready">
    <h1>Primary navigation regression fixture</h1>
    <button data-testid="toggle-applications" @click="toggleApplications">Toggle Applications</button>
    <button data-testid="toggle-projects" @click="toggleProjects">Toggle Projects</button>
  </section>
</template>
<script setup lang="ts">
// Fixture inputs only: production default layout, navigation consumers and router remain real.
import { useProjectsCapabilityStore } from '~/stores/projectsCapabilityStore'
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'
const projects = useProjectsCapabilityStore()
const applications = useApplicationsCapabilityStore()
projects.$patch({ status: 'resolved', capability: { enabled: true, settingKey: 'ENABLE_PROJECTS', source: 'SERVER_SETTING' } })
applications.$patch({ status: 'resolved', capability: { enabled: true, settingKey: 'ENABLE_APPLICATIONS', source: 'SERVER_SETTING', scope: 'BOUND_NODE' } })
const toggleApplications = () => applications.$patch({ capability: { ...applications.capability!, enabled: !applications.isEnabled } })
const toggleProjects = () => projects.$patch({ capability: { ...projects.capability!, enabled: !projects.isEnabled } })
</script>
