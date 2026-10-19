import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: vi.fn(), mutate: vi.fn() }) }))

import WorkspaceToolShell from '../WorkspaceToolShell.vue'
import { RESPONSIVE_WORKSPACE_SHELL_KEY } from '~/composables/layout/useResponsiveWorkspaceShell'
import { resolveResponsiveWorkspaceShellState } from '~/utils/layout/responsiveLayoutPolicy'
import { useRightPanel } from '~/composables/useRightPanel'
import { useRightSideTabs } from '~/composables/useRightSideTabs'
import { useStartSurfaceTools } from '~/composables/layout/useStartSurfaceTools'
import { useTaskLocatorStore } from '~/stores/taskLocatorStore'
import type { TaskWorkerTask } from '~/types/project'

const task: TaskWorkerTask = { taskId: 't1', projectId: 'p1', description: 'Ship it', status: 'TODO' }
const wrappers: ReturnType<typeof mount>[] = []
const mountShell = (width: number, startSurface = false) => {
  const right = useRightPanel()
  const policy = computed(() => resolveResponsiveWorkspaceShellState({
    viewportWidth: width, viewportHeight: 800, leftPanelPreference: 'visible', leftPanelPreferredWidth: 320,
    rightPanelPreference: right.isRightPanelVisible.value ? 'visible' : 'hidden-by-user',
    rightPanelPreferredWidth: right.preferredRightPanelWidth.value, rightPanelResizeIntent: right.rightPanelResizeIntent.value,
  }))
  const wrapper = mount(WorkspaceToolShell, {
    props: { startSurface },
    attachTo: document.body,
    global: {
      provide: { [RESPONSIVE_WORKSPACE_SHELL_KEY as symbol]: policy },
      stubs: {
        RightSideTabs: { template: '<div data-test="stub-right-tabs" />' },
        RightSidebarStrip: { template: '<div data-test="workspace-right-tool-strip" />' },
        WorkspaceRightToolDrawer: { template: '<div data-test="stub-right-drawer" />' },
        StartSurfaceToolsToggle: { template: '<button data-test="stub-start-tools" />' },
      },
    },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('WorkspaceToolShell: "Show Task in Projects" reveal (delegated-copy-task-locator REQ-004)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    useStartSurfaceTools().closeTools()
    const right = useRightPanel()
    right.setRightPanelVisible(true); right.setRightPanelWorkspaceWidth(null)
    right.preferredRightPanelWidth.value = 450; right.rightPanelResizeIntent.value = 'automatic'
    useRightSideTabs().setActiveTab('terminal')
  })
  afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()) })

  const locate = () => { useTaskLocatorStore().locate(task, () => { throw new Error('a mounted shell never opens the run') }) }

  it('shows Projects in the docked panel and marks the request revealed', async () => {
    const wrapper = mountShell(1600)
    await flushPromises()
    locate()
    await flushPromises()
    expect(useRightSideTabs().activeTab.value).toBe('projects')
    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(true)
    expect(useTaskLocatorStore().request?.step).toBe('revealed')
  })

  it('reopens a hidden panel docked (VIS-011)', async () => {
    useRightPanel().setRightPanelVisible(false)
    const wrapper = mountShell(1600)
    await flushPromises()
    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(false)
    locate()
    await flushPromises()
    expect(useRightPanel().isRightPanelVisible.value).toBe(true)
    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(true)
    expect(useTaskLocatorStore().request?.step).toBe('revealed')
  })

  it('opens the right drawer on Projects in a narrow window (VIS-013)', async () => {
    const wrapper = mountShell(900)
    await flushPromises()
    locate()
    await flushPromises()
    expect(wrapper.find('[data-test="stub-right-drawer"]').exists()).toBe(true)
    expect(useRightSideTabs().activeTab.value).toBe('projects')
    expect(useTaskLocatorStore().request?.step).toBe('revealed')
  })

  it('opens the tools of a start surface first', async () => {
    const wrapper = mountShell(1600, true)
    await flushPromises()
    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(false)
    locate()
    await flushPromises()
    expect(useStartSurfaceTools().toolsOpen.value).toBe(true)
    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(true)
    expect(useTaskLocatorStore().request?.step).toBe('revealed')
  })

  it('reveals a request placed before it mounted (a run opened from a page with no right panel, REQ-012)', async () => {
    const openRun = vi.fn()
    useTaskLocatorStore().locate(task, openRun)
    expect(openRun).toHaveBeenCalledOnce()
    const wrapper = mountShell(1600)
    await flushPromises()
    expect(wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(true)
    expect(useTaskLocatorStore().request?.step).toBe('revealed')
  })

  it('stops being the shell when it unmounts', async () => {
    mountShell(1600).unmount()
    const openRun = vi.fn()
    useTaskLocatorStore().locate(task, openRun)
    await flushPromises()
    expect(openRun).toHaveBeenCalledOnce()
    expect(useTaskLocatorStore().request?.step).toBe('pending')
  })
})
