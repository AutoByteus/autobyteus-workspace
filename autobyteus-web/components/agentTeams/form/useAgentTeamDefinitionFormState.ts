import { computed, ref, type ComputedRef } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type {
  AgentMemberRefScope,
  AgentTeamDefinitionOwnershipScope,
  TeamMemberInput,
} from '~/stores/agentTeamDefinitionStore'
import type { AgentDefinitionOwnershipScope } from '~/stores/agentDefinitionStore'
import {
  buildTeamLocalAgentDefinitionId,
  parseTeamLocalAgentDefinitionId,
} from '~/utils/teamLocalAgentDefinitionId'

type ReferenceType = 'AGENT' | 'AGENT_TEAM'
type RefScope = AgentMemberRefScope

type AgentLibraryDefinition = {
  id: string
  name: string
  ownershipScope?: AgentDefinitionOwnershipScope | null
}

type TeamLibraryDefinition = {
  id: string
  name: string
  ownershipScope?: AgentTeamDefinitionOwnershipScope | null
}

type TeamFormData = {
  name: string
  category: string
  description: string
  instructions: string
  avatarUrl: string
  coordinatorMemberName: string
  nodes: TeamMemberInput[]
}

type FormStateOptions = {
  formData: TeamFormData
  formErrors: Record<string, string>
  currentTeamDefinitionId: ComputedRef<string | null>
  agentDefinitions: ComputedRef<AgentLibraryDefinition[]>
  teamDefinitions: ComputedRef<TeamLibraryDefinition[]>
  getAgentDefinitionById: (id: string) => AgentLibraryDefinition | null | undefined
  getAgentTeamDefinitionById: (id: string) => TeamLibraryDefinition | null | undefined
}

export interface LibraryItem {
  id: string
  name: string
  refType: ReferenceType
  refScope?: Exclude<RefScope, null>
  persistedRef?: string
}

export const createInitialFormData = (): TeamFormData => ({
  name: '',
  category: '',
  description: '',
  instructions: '',
  avatarUrl: '',
  coordinatorMemberName: '',
  nodes: [],
})

export const mapInitialTeamNodes = (nodes: TeamMemberInput[] = []): TeamMemberInput[] =>
  nodes.map((node) => ({
    memberName: node.memberName,
    refType: node.refType,
    ref: node.ref,
    refScope: node.refType === 'AGENT' ? node.refScope ?? 'SHARED' : null,
  }))

export const buildSubmitNodes = (nodes: TeamMemberInput[]): TeamMemberInput[] =>
  nodes.map((node) => ({
    memberName: node.memberName.trim(),
    refType: node.refType,
    ref: node.ref,
    refScope: node.refType === 'AGENT' ? node.refScope ?? 'SHARED' : null,
  }))

const normalizeAgentLibraryScope = (
  value: AgentDefinitionOwnershipScope | null | undefined,
): Exclude<RefScope, null> => {
  if (value === 'TEAM_LOCAL' || value === 'APPLICATION_OWNED') {
    return value
  }
  return 'SHARED'
}

export const useAgentTeamDefinitionFormState = ({
  formData,
  formErrors,
  currentTeamDefinitionId,
  agentDefinitions,
  teamDefinitions,
  getAgentDefinitionById,
  getAgentTeamDefinitionById,
}: FormStateOptions) => {
  const { t } = useLocalization()
  const librarySearch = ref('')
  const selectedNodeIndex = ref<number | null>(null)
  const isCanvasDragOver = ref(false)

  const clearErrors = () => {
    Object.keys(formErrors).forEach((key) => delete formErrors[key])
  }

  const agentLibraryItems = computed<LibraryItem[]>(() =>
    agentDefinitions.value.map((agent) => {
      const parsedTeamLocalId = parseTeamLocalAgentDefinitionId(agent.id)
      return {
        id: agent.id,
        name: agent.name,
        refType: 'AGENT',
        refScope: normalizeAgentLibraryScope(agent.ownershipScope),
        persistedRef: parsedTeamLocalId?.agentId,
      }
    }),
  )

  const teamLibraryItems = computed<LibraryItem[]>(() =>
    teamDefinitions.value
      .filter((team) => team.id !== currentTeamDefinitionId.value)
      .map((team) => ({
        id: team.id,
        name: team.name,
        refType: 'AGENT_TEAM',
      })),
  )

  const filteredAgentItems = computed(() => {
    const query = librarySearch.value.trim().toLowerCase()
    if (!query) {
      return agentLibraryItems.value
    }
    return agentLibraryItems.value.filter((item) => item.name.toLowerCase().includes(query))
  })

  const filteredTeamItems = computed(() => {
    const query = librarySearch.value.trim().toLowerCase()
    if (!query) {
      return teamLibraryItems.value
    }
    return teamLibraryItems.value.filter((item) => item.name.toLowerCase().includes(query))
  })

  const selectedNode = computed(() => {
    if (selectedNodeIndex.value === null) {
      return null
    }
    return formData.nodes[selectedNodeIndex.value] || null
  })

  const getReferenceName = (node: TeamMemberInput): string => {
    if (node.refType === 'AGENT') {
      if (node.refScope === 'TEAM_LOCAL') {
        const canonicalDefinitionId = currentTeamDefinitionId.value
          ? buildTeamLocalAgentDefinitionId(currentTeamDefinitionId.value, node.ref)
          : null
        return (
          (canonicalDefinitionId
            ? getAgentDefinitionById(canonicalDefinitionId)?.name
            : null)
          || t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.localAgent', { id: node.ref })
        )
      }
      return getAgentDefinitionById(node.ref)?.name || node.ref
    }
    return getAgentTeamDefinitionById(node.ref)?.name || node.ref
  }

  const buildMemberBaseName = (rawName: string): string => {
    const normalized = rawName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase()

    return normalized || 'member'
  }

  const buildUniqueMemberName = (rawName: string): string => {
    const baseName = buildMemberBaseName(rawName)
    const used = new Set(formData.nodes.map((node) => node.memberName))
    if (!used.has(baseName)) {
      return baseName
    }

    let counter = 2
    while (used.has(`${baseName}_${counter}`)) {
      counter += 1
    }
    return `${baseName}_${counter}`
  }

  const addNodeFromLibrary = (item: LibraryItem) => {
    const newNode: TeamMemberInput = {
      memberName: buildUniqueMemberName(item.name),
      refType: item.refType,
      ref: item.refType === 'AGENT' ? item.persistedRef ?? item.id : item.id,
      refScope: item.refType === 'AGENT' ? item.refScope ?? 'SHARED' : null,
    }

    formData.nodes.push(newNode)
    selectedNodeIndex.value = formData.nodes.length - 1

    if (!formData.coordinatorMemberName && newNode.refType === 'AGENT') {
      formData.coordinatorMemberName = newNode.memberName
    }
  }

  const onLibraryDragStart = (event: DragEvent, item: LibraryItem) => {
    if (!event.dataTransfer) {
      return
    }
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify(item))
  }

  const handleCanvasDrop = (event: DragEvent) => {
    isCanvasDragOver.value = false
    const payload = event.dataTransfer?.getData('application/json')
    if (!payload) {
      return
    }

    try {
      const item = JSON.parse(payload) as LibraryItem
      if (!item?.id || !item?.name || !item?.refType) {
        return
      }
      addNodeFromLibrary(item)
    } catch (error) {
      console.error('Failed to parse dropped team member payload:', error)
    }
  }

  const selectNode = (index: number) => {
    selectedNodeIndex.value = index
  }

  const removeNode = (index: number) => {
    const removedNodeName = formData.nodes[index]?.memberName
    formData.nodes.splice(index, 1)

    if (formData.coordinatorMemberName === removedNodeName) {
      formData.coordinatorMemberName = ''
    }

    if (selectedNodeIndex.value === null) {
      return
    }
    if (formData.nodes.length === 0) {
      selectedNodeIndex.value = null
    } else if (selectedNodeIndex.value >= formData.nodes.length) {
      selectedNodeIndex.value = formData.nodes.length - 1
    } else if (selectedNodeIndex.value === index) {
      selectedNodeIndex.value = Math.max(0, index - 1)
    }
  }

  const isCoordinator = (node: TeamMemberInput) =>
    formData.coordinatorMemberName === node.memberName

  const toggleCoordinator = (node: TeamMemberInput) => {
    if (node.refType !== 'AGENT') {
      return
    }
    formData.coordinatorMemberName = isCoordinator(node) ? '' : node.memberName
  }

  const updateSelectedMemberName = (nextNameRaw: string) => {
    if (!selectedNode.value) {
      return
    }
    const nextName = nextNameRaw.trim()
    const oldName = selectedNode.value.memberName
    selectedNode.value.memberName = nextName

    if (formData.coordinatorMemberName === oldName) {
      formData.coordinatorMemberName = nextName
    }
  }

  const validateForm = () => {
    clearErrors()
    let valid = true

    if (!formData.name.trim()) {
      formErrors.name = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.teamNameRequired')
      valid = false
    }

    if (!formData.description.trim()) {
      formErrors.description = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.teamDescriptionRequired')
      valid = false
    }

    if (formData.nodes.length === 0) {
      formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.addMember')
      valid = false
    }

    const memberNames = new Set<string>()
    for (const node of formData.nodes) {
      if (!node.memberName.trim()) {
        formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.memberNameRequired')
        valid = false
        break
      }
      if (!node.ref) {
        formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.memberSourceRequired')
        valid = false
        break
      }
      if (node.refType === 'AGENT' && !node.refScope) {
        formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.agentScopeRequired')
        valid = false
        break
      }
      if (node.refType === 'AGENT_TEAM' && node.refScope) {
        formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.nestedTeamScopeForbidden')
        valid = false
        break
      }
      if (memberNames.has(node.memberName)) {
        formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.memberNamesUnique')
        valid = false
        break
      }
      memberNames.add(node.memberName)

      if (
        currentTeamDefinitionId.value
        && node.refType === 'AGENT_TEAM'
        && node.ref === currentTeamDefinitionId.value
      ) {
        formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.selfReferenceForbidden')
        valid = false
        break
      }
    }

    if (!formData.coordinatorMemberName) {
      formErrors.coordinatorMemberName = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.coordinatorRequired')
      valid = false
    } else {
      const coordinatorExists = formData.nodes.some(
        (node) => node.refType === 'AGENT' && node.memberName === formData.coordinatorMemberName,
      )
      if (!coordinatorExists) {
        formErrors.coordinatorMemberName = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.coordinatorMustBeAgent')
        valid = false
      }
    }

    return valid
  }

  return {
    addNodeFromLibrary,
    clearErrors,
    filteredAgentItems,
    filteredTeamItems,
    getReferenceName,
    handleCanvasDrop,
    isCanvasDragOver,
    isCoordinator,
    librarySearch,
    onLibraryDragStart,
    removeNode,
    selectNode,
    selectedNode,
    selectedNodeIndex,
    toggleCoordinator,
    updateSelectedMemberName,
    validateForm,
  }
}
