import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '~/stores/projectStore'
import { TEMP_TASKS_LIST_ID, useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

/** What the right panel's Projects tab shows: one Project's board, or the Temp tasks board. */
export type ProjectsPanelChoice = Readonly<{ kind: 'project'; projectId: string } | { kind: 'temp' }>

export const PROJECTS_PANEL_STORAGE_PREFIX = 'autobyteus.projectsPanel.choice.'

const storage = (): Storage | null => (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null)

const parseChoice = (raw: string | null): ProjectsPanelChoice | null => {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as { kind?: unknown; projectId?: unknown }
    if (value?.kind === 'temp') return { kind: 'temp' }
    if (value?.kind === 'project' && typeof value.projectId === 'string' && value.projectId) return { kind: 'project', projectId: value.projectId }
  } catch { /* an unreadable value is no choice */ }
  return null
}

/**
 * The Projects tab's choice (REQ-007): remembered per bound node across restarts. Without one (or
 * when the remembered Project is gone) it defaults to the most recently updated Project, else Temp
 * tasks. The lists themselves come from the same live stores as the Projects pages.
 */
export const useProjectsPanelStore = defineStore('projectsPanel', () => {
  const node = useWindowNodeContextStore()
  const projectStore = useProjectStore()
  const taskStore = useProjectTaskStore()
  const storageKey = () => `${PROJECTS_PANEL_STORAGE_PREFIX}${node.nodeId}`
  const remembered = ref<ProjectsPanelChoice | null>(null)
  const readRemembered = () => { remembered.value = parseChoice(storage()?.getItem(storageKey()) ?? null) }
  readRemembered()
  watch(() => node.nodeId, readRemembered)

  const defaultChoice = computed<ProjectsPanelChoice>(() => {
    const latest = [...projectStore.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    return latest ? { kind: 'project', projectId: latest.projectId } : { kind: 'temp' }
  })

  const choice = computed<ProjectsPanelChoice>(() => {
    const value = remembered.value
    if (value?.kind === 'temp') return value
    // Keep a remembered Project until the list is known; then it must still exist.
    if (value?.kind === 'project' && (!projectStore.hasFetched || projectStore.projects.some((p) => p.projectId === value.projectId))) return value
    return defaultChoice.value
  })

  /** No Projects and no Temp tasks on this node: the tab shows its empty state. */
  const isEmpty = computed(() => {
    const temp = taskStore.getTempList()
    return projectStore.hasFetched && projectStore.projects.length === 0 && Boolean(temp?.hasLoaded) && temp!.tasks.length === 0
  })

  const choose = (next: ProjectsPanelChoice) => {
    remembered.value = next
    try { storage()?.setItem(storageKey(), JSON.stringify(next)) } catch { /* storage full or unavailable: keep it for this session */ }
  }

  /** Loads what the picker and the empty state need (the Projects list and the Temp tasks list). */
  const load = () => {
    void projectStore.fetchProjects().catch(() => undefined)
    void taskStore.fetchTasks(TEMP_TASKS_LIST_ID).catch(() => undefined)
  }

  return { choice, remembered, isEmpty, choose, load }
})
