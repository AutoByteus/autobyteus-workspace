/** runSectionModeStore (projects-left-navigation, REQ-001, AC-001): the run section's mode is remembered per node. */
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
})
