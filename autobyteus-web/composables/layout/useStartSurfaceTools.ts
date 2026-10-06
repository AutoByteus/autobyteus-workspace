import { computed, ref, watch, type ComputedRef, type InjectionKey } from 'vue'
import { useRightPanel } from '~/composables/useRightPanel'
import { knownRunWorkspaceOf } from '~/services/workspace/runWorkspaceChoice'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'

/**
 * REQ-020: the start surfaces (New chat, the Org launch page) keep the right tools (Files,
 * Terminal, …) behind one small icon. Closed until opened; the choice is remembered, holds across
 * switches, and opening also opens the shared panel, so a run started from the page keeps it.
 */
const STORAGE_KEY = 'autobyteus.chat.startToolsOpen'

const readStored = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}
const startToolsOpen = ref(readStored())
const writeStored = (open: boolean) => {
  startToolsOpen.value = open
  try { localStorage.setItem(STORAGE_KEY, open ? '1' : '0') } catch { /* private mode */ }
}

export function useStartSurfaceTools() {
  const { isRightPanelVisible, setRightPanelVisible } = useRightPanel()
  const toolsOpen = computed(() => startToolsOpen.value && isRightPanelVisible.value)
  // The panel's own close button hides the shared panel; the start surface remembers it closed.
  watch(isRightPanelVisible, (visible) => { if (!visible && startToolsOpen.value) writeStored(false) })
  const openTools = () => {
    writeStored(true)
    setRightPanelVisible(true)
  }
  const closeTools = () => writeStored(false)
  return { toolsOpen, openTools, closeTools }
}

/** The workspace Files and Terminal use on a start surface: the one chosen there. */
export type StartSurfaceWorkspace = Readonly<{ workspaceId: string | null; workspaceMetadata: WorkspaceMetadata | null }>
export const START_SURFACE_WORKSPACE: InjectionKey<ComputedRef<StartSurfaceWorkspace | null>> = Symbol('startSurfaceWorkspace')

/** Read-only: a typed folder that is not a known workspace yet has no files to show. */
export const startSurfaceWorkspaceOf = (choice: RunWorkspaceChoice | null | undefined): StartSurfaceWorkspace =>
  knownRunWorkspaceOf(choice)
