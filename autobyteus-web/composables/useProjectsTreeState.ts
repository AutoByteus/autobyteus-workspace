import { ref, watch, type Ref } from 'vue'
import type { WorkspaceHistorySectionState } from '~/components/workspace/history/workspaceHistorySectionContracts'
import { projectSectionKey, type ProjectRunAncestry, type ProjectRunsProjection } from '~/stores/projectRunsProjection'

const groupKey = (sectionKey: string, kind: 'agent' | 'team' | 'org', key: string) => `${sectionKey}\u0000${kind}\u0000${key}`

/**
 * projects-left-navigation (DS-003, REQ-012): which Projects and groups of the Projects tree are open. The returned
 * section state is the run section's own (`base`) with the Project rows' and groups' expansion replaced; run-level
 * expansion (Team runs, members, Org runs) stays the shared one. When the open run is listed under Projects, it is
 * revealed in every Project that lists it: on showing the mode and on opening a run while the mode is shown.
 */
export const useProjectsTreeState = (input: Readonly<{
  base: WorkspaceHistorySectionState
  projection: Ref<ProjectRunsProjection>
  /** The open Agent run, Team run and Org run, whichever is open. */
  openRun: () => Readonly<{ agentRunId: string | null; teamRunId: string | null; orgRunId: string | null }>
}>) => {
  const open = ref<ReadonlySet<string>>(new Set())
  const isOpen = (key: string) => open.value.has(key)
  const setOpen = (key: string, value: boolean) => {
    if (isOpen(key) === value) return
    const next = new Set(open.value)
    if (value) next.add(key)
    else next.delete(key)
    open.value = next
  }

  const state: WorkspaceHistorySectionState = Object.assign(Object.create(input.base) as WorkspaceHistorySectionState, {
    isWorkspaceExpanded: (sectionKey: string) => isOpen(sectionKey),
    // A Project row only opens or closes; it never reads a folder's history.
    toggleWorkspace: (node: { stableKey?: string; workspaceId: string }) => setOpen(node.stableKey ?? node.workspaceId, !isOpen(node.stableKey ?? node.workspaceId)),
    isAgentExpanded: (sectionKey: string, id: string) => isOpen(groupKey(sectionKey, 'agent', id)),
    toggleAgent: (sectionKey: string, id: string) => setOpen(groupKey(sectionKey, 'agent', id), !isOpen(groupKey(sectionKey, 'agent', id))),
    isTeamDefinitionExpanded: (sectionKey: string, key: string) => isOpen(groupKey(sectionKey, 'team', key)),
    toggleTeamDefinition: (sectionKey: string, key: string) => setOpen(groupKey(sectionKey, 'team', key), !isOpen(groupKey(sectionKey, 'team', key))),
    isAgentOrgDefinitionExpanded: (sectionKey: string, id: string) => isOpen(groupKey(sectionKey, 'org', id)),
    toggleAgentOrgDefinition: (sectionKey: string, id: string) => setOpen(groupKey(sectionKey, 'org', id), !isOpen(groupKey(sectionKey, 'org', id))),
    // Project rows have no folder history to load or fail.
    isWorkspaceHistoryLoading: () => false,
    workspaceHistoryError: () => null,
  })

  const openProject = (projectId: string) => setOpen(projectSectionKey(projectId), true)

  const revealIn = (ancestry: readonly ProjectRunAncestry[], kind: 'agent' | 'team' | 'org') => {
    for (const entry of ancestry) {
      const sectionKey = projectSectionKey(entry.projectId)
      setOpen(sectionKey, true)
      setOpen(groupKey(sectionKey, kind, entry.groupKey), true)
    }
  }
  const ancestryOfOpenRun = (): Readonly<{ kind: 'agent' | 'team' | 'org'; ancestry: readonly ProjectRunAncestry[] }> | null => {
    const run = input.openRun()
    const projection = input.projection.value
    if (run.teamRunId) return { kind: 'team', ancestry: projection.teamAncestryById[run.teamRunId] ?? [] }
    if (run.orgRunId) return { kind: 'org', ancestry: projection.agentOrgAncestryById[run.orgRunId] ?? [] }
    if (run.agentRunId) return { kind: 'agent', ancestry: projection.runAncestryById[run.agentRunId] ?? [] }
    return null
  }
  // Only a change of the open run or of where it is listed reveals it again; a group the user closed stays closed.
  watch(() => JSON.stringify([input.openRun(), ancestryOfOpenRun()]), () => {
    const found = ancestryOfOpenRun()
    if (found) revealIn(found.ancestry, found.kind)
  }, { immediate: true })

  return { state, openProject }
}
