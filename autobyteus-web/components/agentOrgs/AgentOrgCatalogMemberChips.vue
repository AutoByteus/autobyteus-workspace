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
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentOrgDefinition, AgentOrgMember } from '~/stores/agentOrgDefinitionStore'
import { formatMemberRoleLabel } from '~/utils/collaboration/memberRoleLabel'

defineProps<{ org: AgentOrgDefinition }>()
const { t } = useLocalization()

const memberLabel = (member: AgentOrgMember): string => {
  return formatMemberRoleLabel(member.memberName)
    || t(member.refType === 'AGENT_TEAM' ? 'agentOrgs.experience.member.teamFallback' : 'agentOrgs.experience.member.agentFallback')
}
</script>
