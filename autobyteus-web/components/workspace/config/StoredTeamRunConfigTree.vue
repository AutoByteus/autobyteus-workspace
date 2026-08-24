<template>
  <div class="space-y-3" data-test="stored-team-config-tree">
    <section
      v-for="team in directTeams"
      :key="team.address"
      class="rounded-lg border border-slate-200 bg-white p-3"
      :aria-labelledby="headingId(team.address)"
      data-test="stored-team-scope"
    >
      <button
        type="button"
        class="flex w-full items-start gap-2 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :aria-expanded="isExpanded(team.address)"
        :aria-controls="panelId(team.address)"
        @click="toggle(team.address)"
      >
        <span aria-hidden="true" class="pt-0.5 text-slate-500">{{ isExpanded(team.address) ? '▾' : '▸' }}</span>
        <span class="min-w-0 flex-1">
          <span :id="headingId(team.address)" class="block truncate text-sm font-semibold text-slate-900">{{ team.displayName }}</span>
          <span class="block truncate font-mono text-xs text-slate-500">{{ team.address }}</span>
        </span>
        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="team.isCustomized ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'">
          {{ team.isCustomized ? customizedValue : inheritedValue }}
        </span>
      </button>
      <div v-show="isExpanded(team.address)" :id="panelId(team.address)" class="mt-4 border-t border-slate-100 pt-4">
        <StoredLaunchConfigurationCard :config="team.effectiveConfig" />
        <div v-if="hasChildren(team.address)" class="mt-4 border-l border-slate-200 pl-3">
          <StoredTeamRunConfigTree :view="view" :parent-address="team.address" />
        </div>
      </div>
    </section>

    <section
      v-for="agent in directAgents"
      :key="agent.address"
      class="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
      :aria-labelledby="headingId(agent.address)"
      data-test="stored-agent-snapshot"
    >
      <h5 :id="headingId(agent.address)" class="text-sm font-semibold text-slate-900">{{ agent.displayName }}</h5>
      <p class="mb-3 truncate font-mono text-xs text-slate-500">{{ agent.address }}</p>
      <StoredLaunchConfigurationCard :config="agent.effectiveConfig" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { TeamRunConfigurationView } from '~/types/agent/TeamRunConfig'
import { useLocalization } from '~/composables/useLocalization'
import StoredLaunchConfigurationCard from './StoredLaunchConfigurationCard.vue'

const props = defineProps<{
  view: Readonly<TeamRunConfigurationView>
  parentAddress: AgentTeamAddress
}>()
const { t } = useLocalization()
const expandedAddresses = ref(new Set<AgentTeamAddress>(Object.values(props.view.teamsByAddress)
  .filter((team) => team.parentAddress === props.parentAddress)
  .map((team) => team.address)))
const directTeams = computed(() => Object.values(props.view.teamsByAddress)
  .filter((team) => team.parentAddress === props.parentAddress)
  .sort((left, right) => left.address.localeCompare(right.address)))
const directAgents = computed(() => Object.values(props.view.agentsByAddress)
  .filter((agent) => agent.containingTeamAddress === props.parentAddress)
  .sort((left, right) => left.address.localeCompare(right.address)))
const customizedValue = computed(() => t('workspace.components.workspace.config.StoredTeamRunConfig.customized'))
const inheritedValue = computed(() => t('workspace.components.workspace.config.StoredTeamRunConfig.inherited'))
const domKey = (address: AgentTeamAddress) => address.slice(1).replaceAll('/', '-')
const headingId = (address: AgentTeamAddress) => `stored-config-${domKey(address)}-heading`
const panelId = (address: AgentTeamAddress) => `stored-config-${domKey(address)}-panel`
const isExpanded = (address: AgentTeamAddress): boolean => expandedAddresses.value.has(address)
const toggle = (address: AgentTeamAddress): void => {
  const next = new Set(expandedAddresses.value)
  if (next.has(address)) next.delete(address)
  else next.add(address)
  expandedAddresses.value = next
}
const hasChildren = (address: AgentTeamAddress): boolean => Object.values(props.view.teamsByAddress)
  .some((team) => team.parentAddress === address)
  || Object.values(props.view.agentsByAddress).some((agent) => agent.containingTeamAddress === address)
</script>
