import { computed, ref, type ComputedRef } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentMemberRefScope, TeamMemberInput } from '~/stores/agentTeamDefinitionStore'
import type { AgentDefinitionOwnershipScope } from '~/stores/agentDefinitionStore'
import { buildTeamLocalAgentDefinitionId, parseTeamLocalDefinitionId } from '~/utils/teamLocalDefinitionId'

type AgentLibraryDefinition = { id: string; name: string; ownershipScope?: AgentDefinitionOwnershipScope | null }
type TeamFormData = { name: string; category: string; description: string; instructions: string; avatarUrl: string; coordinatorMemberName: string; nodes: TeamMemberInput[] }
type FormStateOptions = {
  formData: TeamFormData; formErrors: Record<string, string>; currentTeamDefinitionId: ComputedRef<string | null>;
  agentDefinitions: ComputedRef<AgentLibraryDefinition[]>; getAgentDefinitionById: (id: string) => AgentLibraryDefinition | null | undefined;
}
export interface LibraryItem { id: string; name: string; refScope?: Exclude<AgentMemberRefScope, null>; persistedRef?: string }
export const createInitialFormData = (): TeamFormData => ({ name: '', category: '', description: '', instructions: '', avatarUrl: '', coordinatorMemberName: '', nodes: [] })
export const mapInitialTeamNodes = (nodes: TeamMemberInput[] = []): TeamMemberInput[] => nodes.map((node) => ({ memberName: node.memberName, ref: node.ref, refScope: node.refScope ?? 'SHARED' }))
export const buildSubmitNodes = (nodes: TeamMemberInput[]): TeamMemberInput[] => nodes.map((node) => ({ memberName: node.memberName.trim(), ref: node.ref, refScope: node.refScope ?? 'SHARED' }))
const scope = (value?: AgentDefinitionOwnershipScope | null): Exclude<AgentMemberRefScope, null> => value === 'TEAM_LOCAL' || value === 'APPLICATION_OWNED' ? value : 'SHARED'

export const useAgentTeamDefinitionFormState = ({ formData, formErrors, currentTeamDefinitionId, agentDefinitions, getAgentDefinitionById }: FormStateOptions) => {
  const { t } = useLocalization(); const librarySearch = ref(''); const selectedNodeIndex = ref<number | null>(null); const isCanvasDragOver = ref(false)
  const clearErrors = () => Object.keys(formErrors).forEach((key) => delete formErrors[key])
  const items = computed<LibraryItem[]>(() => agentDefinitions.value.map((agent) => ({ id: agent.id, name: agent.name, refScope: scope(agent.ownershipScope), persistedRef: parseTeamLocalDefinitionId(agent.id)?.localDefinitionId })))
  const filteredAgentItems = computed(() => { const q = librarySearch.value.trim().toLowerCase(); return q ? items.value.filter((item) => item.name.toLowerCase().includes(q)) : items.value })
  const selectedNode = computed(() => selectedNodeIndex.value === null ? null : formData.nodes[selectedNodeIndex.value] || null)
  const getReferenceName = (node: TeamMemberInput): string => {
    if (node.refScope === 'TEAM_LOCAL') {
      const id = currentTeamDefinitionId.value ? buildTeamLocalAgentDefinitionId(currentTeamDefinitionId.value, node.ref) : null
      return (id ? getAgentDefinitionById(id)?.name : null) || `Local Agent ${node.ref}`
    }
    return getAgentDefinitionById(node.ref)?.name || node.ref
  }
  const uniqueName = (raw: string): string => { const base = raw.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'member'; const used = new Set(formData.nodes.map((node) => node.memberName)); let name = base, i = 2; while (used.has(name)) name = `${base}_${i++}`; return name }
  const addNodeFromLibrary = (item: LibraryItem) => { const node = { memberName: uniqueName(item.name), ref: item.persistedRef ?? item.id, refScope: item.refScope ?? 'SHARED' } satisfies TeamMemberInput; formData.nodes.push(node); selectedNodeIndex.value = formData.nodes.length - 1; if (!formData.coordinatorMemberName) formData.coordinatorMemberName = node.memberName }
  const onLibraryDragStart = (event: DragEvent, item: LibraryItem) => { if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('application/json', JSON.stringify(item)) } }
  const handleCanvasDrop = (event: DragEvent) => { isCanvasDragOver.value = false; const payload = event.dataTransfer?.getData('application/json'); if (!payload) return; try { const item = JSON.parse(payload) as LibraryItem; if (item.id && item.name) addNodeFromLibrary(item) } catch (error) { console.error('Failed to parse dropped Team Agent payload:', error) } }
  const selectNode = (index: number) => { selectedNodeIndex.value = index }
  const removeNode = (index: number) => { const name = formData.nodes[index]?.memberName; formData.nodes.splice(index, 1); if (formData.coordinatorMemberName === name) formData.coordinatorMemberName = ''; if (!formData.nodes.length) selectedNodeIndex.value = null; else if (selectedNodeIndex.value !== null) selectedNodeIndex.value = Math.min(selectedNodeIndex.value, formData.nodes.length - 1) }
  const isCoordinator = (node: TeamMemberInput) => formData.coordinatorMemberName === node.memberName
  const toggleCoordinator = (node: TeamMemberInput) => { formData.coordinatorMemberName = isCoordinator(node) ? '' : node.memberName }
  const updateSelectedMemberName = (raw: string) => { if (!selectedNode.value) return; const old = selectedNode.value.memberName; selectedNode.value.memberName = raw.trim(); if (formData.coordinatorMemberName === old) formData.coordinatorMemberName = selectedNode.value.memberName }
  const validateForm = (): boolean => {
    clearErrors(); let valid = true
    if (!formData.name.trim()) { formErrors.name = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.teamNameRequired'); valid = false }
    if (!formData.description.trim()) { formErrors.description = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.teamDescriptionRequired'); valid = false }
    if (!formData.nodes.length) { formErrors.nodes = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.addMember'); valid = false }
    const names = new Set<string>(); for (const node of formData.nodes) { const folded = node.memberName.trim().toLowerCase(); if (!folded || !node.ref || !node.refScope || names.has(folded)) { formErrors.nodes = 'Every Agent placement needs a unique name, source, and scope.'; valid = false; break } names.add(folded) }
    if (!formData.coordinatorMemberName || !formData.nodes.some((node) => node.memberName === formData.coordinatorMemberName)) { formErrors.coordinatorMemberName = t('agentTeams.components.agentTeams.form.useAgentTeamDefinitionFormState.error.coordinatorRequired'); valid = false }
    return valid
  }
  return { addNodeFromLibrary, clearErrors, filteredAgentItems, getReferenceName, handleCanvasDrop, isCanvasDragOver, isCoordinator, librarySearch, onLibraryDragStart, removeNode, selectNode, selectedNode, selectedNodeIndex, toggleCoordinator, updateSelectedMemberName, validateForm }
}
