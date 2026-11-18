/**
 * runSectionModeStore (projects-left-navigation REQ-001; workspace-tree-vs-chooser REQ-006, AC-009): the run section's view is
 * remembered per node.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { RUN_SECTION_MODE_STORAGE_PREFIX, useRunSectionModeStore } from '../runSectionModeStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'

const restart = (entryId: string) => {
  setActivePinia(createPinia())
  useWindowNodeContextStore().entryId = entryId
  return useRunSectionModeStore()
}

describe('runSectionModeStore', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts in Workspaces and remembers Projects per node across restarts', () => {
    const store = restart('node-a')
    expect(store.mode).toBe('workspaces')
    store.setMode('projects')
    expect(window.localStorage.getItem(`${RUN_SECTION_MODE_STORAGE_PREFIX}node-a`)).toBe('projects')
    expect(restart('node-a').mode).toBe('projects')
    expect(restart('node-b').mode).toBe('workspaces')
  })

  it('remembers the Runs view; an unknown stored value reads as the default Workspaces view', () => {
    restart('node-a').setMode('runs')
    expect(restart('node-a').mode).toBe('runs')
    window.localStorage.setItem(`${RUN_SECTION_MODE_STORAGE_PREFIX}node-a`, 'folders')
    expect(restart('node-a').mode).toBe('workspaces')
  })
})
