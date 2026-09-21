<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <button type="button" class="mb-5 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="goBack">
        <span aria-hidden="true" class="mr-2">←</span>{{ returnToOrgId ? $t('agentTeams.components.agentTeams.AgentTeamDetail.backToAgentOrgs') : $t('agentTeams.components.agentTeams.AgentTeamDetail.back_to_agent_teams') }}
      </button>

      <div v-if="loading" class="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        <p class="text-slate-600">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.loading_agent_team_details') }}</p>
      </div>
      <div v-else-if="!teamDef" class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <h2 class="font-bold">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.agent_team_not_found') }}</h2>
        <p v-if="referenceError" class="mt-2 text-sm" role="alert">{{ referenceError }}</p>
      </div>

      <div v-else class="space-y-4">
        <header class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 items-start gap-4">
              <span class="inline-flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl font-semibold text-slate-700">
                <img v-if="teamDef.avatarUrl" :src="teamDef.avatarUrl" :alt="teamDef.name" class="h-full w-full object-cover" />
                <template v-else>{{ initials(teamDef.name) }}</template>
              </span>
              <div class="min-w-0">
                <h1 class="truncate text-3xl font-bold tracking-tight text-slate-950">{{ teamDef.name }}</h1>
                <span class="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{{ teamDef.category || $t('agentTeams.components.agentTeams.AgentTeamDetail.uncategorized') }}</span>
              </div>
            </div>
            <div class="flex shrink-0 gap-2">
              <button type="button" class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" @click="runTeam">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.run') }}</button>
              <button type="button" class="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="$emit('navigate', { view: 'team-edit', id: teamDef.id })">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.edit') }}</button>
              <button v-if="isShared" type="button" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100" @click="showDeleteConfirm = true">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.delete') }}</button>
            </div>
          </div>
        </header>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.descriptionHeading') }}</h2>
          <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ teamDef.description }}</p>
        </section>

        <ExpandableInstructionCard :content="teamDef.instructions" variant="slate" />

        <HandoffManager :model-value="displayHandoffs" :from-options="handoffEndpoints" :to-options="handoffEndpoints" mode="view" scope="team" />

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.membersHeading', { count: teamDef.nodes.length }) }}</h2>
          <div class="mt-4 grid gap-3 lg:grid-cols-2">
            <article v-for="node in teamDef.nodes" :key="`${node.memberName}:${node.ref}`" class="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{{ initials(node.memberName) }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-semibold text-slate-900">{{ node.memberName }}</p>
                  <span v-if="node.memberName === teamDef.coordinatorMemberName" class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.badgeCoordinator') }}</span>
                </div>
                <p class="truncate text-xs text-slate-500">{{ agentName(node) }}</p>
              </div>
              <button v-if="agentId(node)" type="button" class="text-xs font-semibold text-blue-700 hover:underline" data-test="agent-member-view" @click="viewAgent(node)">{{ $t('agentTeams.components.agentTeams.AgentTeamDetail.viewAgentAction') }}</button>
            </article>
          </div>
        </section>
      </div>
    </div>

    <AgentDeleteConfirmDialog
      :show="showDeleteConfirm"
      :item-name="teamDef?.name || ''"
      :item-type="$t('agentTeams.components.agentTeams.AgentTeamDetail.deleteItemType')"
      :title="$t('agentTeams.components.agentTeams.AgentTeamDetail.delete_agent_team_definition')"
      :confirm-text="$t('agentTeams.components.agentTeams.AgentTeamDetail.delete_definition')"
      @confirm="deleteTeam"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import AgentDeleteConfirmDialog from '~/components/agents/AgentDeleteConfirmDialog.vue'
import ExpandableInstructionCard from '~/components/common/ExpandableInstructionCard.vue'
import HandoffManager from '~/components/collaboration/handoffs/HandoffManager.vue'
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { loadAgentOrgDefinitionReferences, type AgentOrgDefinitionReferences } from '~/services/agentOrgDefinition/agentOrgDefinitionReferences'
import { useRunActions } from '~/composables/useRunActions'
import { useLocalization } from '~/composables/useLocalization'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'
import { toEditableHandoffs, type HandoffEndpointOption } from '~/types/collaboration/handoffs'

const props = defineProps<{ teamDefinitionId: string; returnToOrgId?: string }>()
const { teamDefinitionId, returnToOrgId } = toRefs(props)
const emit = defineEmits(['navigate'])
const router = useRouter()
const teamStore = useAgentTeamDefinitionStore()
const agentStore = useAgentDefinitionStore()
const { prepareTeamRun } = useRunActions()
const { t } = useLocalization()
const loading = ref(false)
const referenceError = ref('')
const showDeleteConfirm = ref(false)
const orgReferences = ref<AgentOrgDefinitionReferences | null>(null)
const teamDef = computed(() => returnToOrgId.value
  ? orgReferences.value?.teams[teamDefinitionId.value] ?? null
  : teamStore.getCatalogAgentTeamDefinitionById(teamDefinitionId.value))
const isShared = computed(() => (teamDef.value?.ownershipScope ?? 'SHARED') === 'SHARED')
type TeamNode = AgentTeamDefinition['nodes'][number]
const agentId = (node: TeamNode): string => node.refScope === 'TEAM_LOCAL' && teamDef.value
  ? buildTeamLocalAgentDefinitionId(teamDef.value.id, node.ref)
  : node.ref
const agentName = (node: TeamNode): string => (orgReferences.value?.agents[agentId(node)] ?? agentStore.getAgentDefinitionById(agentId(node)))?.name || node.ref
const initials = (name: string): string => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'AT'
const handoffEndpoints = computed<HandoffEndpointOption[]>(() => (teamDef.value?.nodes ?? []).map((node) => ({ id: node.memberName, kind: 'agent', label: node.memberName, address: `/${node.memberName}`, group: t('handoffs.manager.groups.teamAgents') })))
const displayHandoffs = computed(() => toEditableHandoffs(teamDef.value?.handoffs))

watch([teamDefinitionId, returnToOrgId], async ([teamId, orgId], _, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  loading.value = true; orgReferences.value = null; referenceError.value = ''
  try {
    await Promise.all([teamStore.fetchAllAgentTeamDefinitions(), agentStore.fetchAllAgentDefinitions()])
    if (orgId) {
      const orgStore = useAgentOrgDefinitionStore()
      await orgStore.fetchAll()
      const member = orgStore.byId(orgId)?.members.find(member => member.refType === 'AGENT_TEAM' && member.ref === teamId)
      if (!member) return
      const resolved = await loadAgentOrgDefinitionReferences(orgId, [member], {
        getCatalogAgentById: agentStore.getAgentDefinitionById, getCatalogTeamById: teamStore.getCatalogAgentTeamDefinitionById,
      })
      if (current && !resolved.unavailable.length) orgReferences.value = resolved
    }
  } catch (error) {
    if (current) referenceError.value = error instanceof Error ? error.message : String(error)
  } finally { if (current) loading.value = false }
}, { immediate: true })
const runTeam = (): void => { if (teamDef.value) { prepareTeamRun(teamDef.value); void router.push('/workspace') } }
const viewAgent = (node: TeamNode): void => { if (teamDef.value) emit('navigate', { target: 'agents', view: 'detail', id: agentId(node), returnToTeam: teamDef.value.id }) }
const deleteTeam = async (): Promise<void> => {
  if (!teamDef.value) return
  const deleted = await teamStore.deleteAgentTeamDefinition(teamDef.value.id)
  showDeleteConfirm.value = false
  if (deleted) emit('navigate', { view: 'team-list' })
}
const goBack = (): void => emit('navigate', props.returnToOrgId
  ? { target: 'agent-orgs', view: 'org-detail', id: props.returnToOrgId }
  : { view: 'team-list' })
</script>
