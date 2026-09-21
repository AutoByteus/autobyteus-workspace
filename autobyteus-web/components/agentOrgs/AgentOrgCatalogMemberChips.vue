<template>
  <div class="mt-4 flex flex-wrap items-center gap-2">
    <span
      v-for="(member, index) in org.members"
      :key="`${member.memberName}-${member.refType}-${member.ref}-${index}`"
      :data-test="`org-member-${member.refType === 'AGENT_TEAM' ? 'team' : 'agent'}-${member.ref}`"
      class="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      :class="member.refType === 'AGENT_TEAM' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-700'"
      :aria-label="t(member.refType === 'AGENT_TEAM' ? 'agentOrgs.experience.member.teamLabel' : 'agentOrgs.experience.member.agentLabel', { name: memberLabel(member) })"
    >
      <Icon :icon="member.refType === 'AGENT_TEAM' ? 'heroicons:user-group-20-solid' : 'heroicons:user-20-solid'" class="h-4 w-4 flex-none" />
      <span class="truncate">{{ memberLabel(member) }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { AgentOrgDefinition, AgentOrgMember } from '~/stores/agentOrgDefinitionStore'
import { loadAgentOrgMemberReferences, type AgentOrgDefinitionReferences } from '~/services/agentOrgDefinition/agentOrgDefinitionReferences'

const props = defineProps<{ org: AgentOrgDefinition; refreshKey: number }>()
const { t } = useLocalization()
const windowContext = useWindowNodeContextStore()
const requestKey = computed(() => JSON.stringify([
  props.org.id, props.org.revision, props.refreshKey, windowContext.bindingRevision,
  props.org.members.map(({ memberName, ref, refType, refScope }) => [memberName, ref, refType, refScope]),
]))
const resolved = shallowRef<{ key: string; references: AgentOrgDefinitionReferences } | null>(null)
watch(requestKey, async (key, _old, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  resolved.value = null
  const orgId = props.org.id
  const members = props.org.members.map(member => ({ ...member }))
  try {
    const references = await loadAgentOrgMemberReferences(orgId, members)
    if (current && requestKey.value === key) resolved.value = { key, references }
  } catch { /* Pending/unavailable references retain the readable role fallback. */ }
}, { immediate: true })

const memberLabel = (member: AgentOrgMember): string => {
  const references = resolved.value?.key === requestKey.value ? resolved.value.references : null
  const definition = member.refType === 'AGENT_TEAM' ? references?.teams[member.ref] : references?.agents[member.ref]
  if (definition?.name?.trim()) return definition.name
  return member.memberName.replace(/[_-]+/g, ' ').trim()
    || t(member.refType === 'AGENT_TEAM' ? 'agentOrgs.experience.member.teamFallback' : 'agentOrgs.experience.member.agentFallback')
}
</script>
