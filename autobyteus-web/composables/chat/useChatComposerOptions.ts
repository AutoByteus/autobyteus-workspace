import { computed, onMounted, type Ref } from 'vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useSkillStore } from '~/stores/skillStore'
import { initialsFor, type ChatTargetOption } from '~/components/chat/chatComposerMenus'
import type { SkillTagOption } from '~/utils/skills/skillTagMenu'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID } from '~/utils/chat/chatDefaults'
import { useLocalization } from '~/composables/useLocalization'

/**
 * Data for the Chat `/` and `@` menus.
 * - `/` lists the addressed agent's effective skills: every enabled installed skill for an
 *   ALL_INSTALLED agent (the same catalog the runtime receives), otherwise its configured skills.
 * - `@` lists agents (except Daily Assistant, the default) and agent teams. Agent Orgs are not addressable.
 */
export function useChatComposerOptions(agentDefinitionId: Ref<string | null>) {
  const agentDefinitionStore = useAgentDefinitionStore()
  const teamDefinitionStore = useAgentTeamDefinitionStore()
  const skillStore = useSkillStore()
  const { t } = useLocalization()

  onMounted(() => {
    if (!agentDefinitionStore.agentDefinitions.length) void agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined)
    if (!teamDefinitionStore.agentTeamDefinitions.length) void teamDefinitionStore.fetchAllAgentTeamDefinitions().catch(() => undefined)
    if (!skillStore.skills.length) void skillStore.fetchAllSkills().catch(() => undefined)
  })

  const agentDefinition = computed(() => (agentDefinitionId.value
    ? agentDefinitionStore.getAgentDefinitionById(agentDefinitionId.value) ?? null
    : null))

  const skillsAllInstalled = computed(() => agentDefinition.value?.skillScope === 'ALL_INSTALLED')

  const skillOptions = computed<SkillTagOption[]>(() => {
    const definition = agentDefinition.value
    if (!definition) return []
    if (definition.skillScope === 'ALL_INSTALLED') {
      return skillStore.skills
        .filter((skill) => !skill.isDisabled)
        .map((skill) => ({ name: skill.name, description: skill.description }))
    }
    return definition.skillNames.map((name) => ({
      name,
      description: skillStore.skills.find((skill) => skill.name === name)?.description ?? '',
    }))
  })

  const targetOptions = computed<ChatTargetOption[]>(() => [
    ...agentDefinitionStore.sharedAgentDefinitions
      .filter((definition) => definition.id !== DEFAULT_CHAT_AGENT_DEFINITION_ID)
      .map((definition) => ({
        key: `agent:${definition.id}`,
        kind: 'agent' as const,
        id: definition.id,
        name: definition.name,
        initials: initialsFor(definition.name),
        description: definition.description,
      })),
    ...teamDefinitionStore.sharedAgentTeamDefinitions.map((team) => ({
      key: `team:${team.id}`,
      kind: 'team' as const,
      id: team.id,
      name: team.name,
      initials: initialsFor(team.name),
      description: t('chat.targets.teamDescription', {
        count: team.nodes.length,
        coordinator: team.coordinatorMemberName,
      }),
    })),
  ])

  return { agentDefinition, skillOptions, skillsAllInstalled, targetOptions }
}
