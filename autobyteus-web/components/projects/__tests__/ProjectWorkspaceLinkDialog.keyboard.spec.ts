import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ProjectWorkspaceLinkDialog from '../ProjectWorkspaceLinkDialog.vue'
import type { Project } from '~/types/project'

// Real ProjectDialogFrame, WorkspaceSelector and SearchableSelect (teleported to document.body).
const { projectStoreMock, workspaceStoreMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
  projectStoreMock: {
    addWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
  },
  workspaceStoreMock: {
    tempWorkspaceId: 'temp_ws_default' as string | null,
    tempWorkspace: { workspaceId: 'temp_ws_default', name: 'temp', absolutePath: '/tmp/default', kind: 'temp', isTemp: true } as any,
    workspaces: {} as Record<string, any>,
    allWorkspaces: [] as any[],
    fetchAllWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
  },
  windowNodeContextStoreMock: {
    isEmbeddedWindow: { __v_isRef: true, value: false },
  },
}))

vi.mock('~/stores/projectStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/stores/projectStore')>()),
  useProjectStore: () => projectStoreMock,
}))

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

const TEMP = { workspaceId: 'temp_ws_default', name: 'temp', absolutePath: '/tmp/default', kind: 'temp', isTemp: true }
const LINKED = { workspaceId: 'agent_ws_a1', name: 'superrepo', absolutePath: '/work/superrepo', kind: 'filesystem', isTemp: false }
const PROTOTYPE = { workspaceId: 'agent_ws_b2', name: 'autobyteus-web-prototype', absolutePath: '/work/autobyteus-web-prototype', kind: 'filesystem', isTemp: false }
const MARKETING = { workspaceId: 'agent_ws_c3', name: 'autobyteus-marketing', absolutePath: '/work/autobyteus-marketing', kind: 'filesystem', isTemp: false }

const project: Project = {
  projectId: 'p1',
  name: 'autobyteus',
  description: '',
  createdAt: '',
  updatedAt: '',
  workspaces: [{
    workspaceId: LINKED.workspaceId,
    workspaceRootPath: LINKED.absolutePath,
    displayName: LINKED.name,
    description: 'Main',
    addedAt: '',
    availability: 'AVAILABLE',
  }],
}

let wrapper: VueWrapper | null = null

const keydown = async (target: Element, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  await flushPromises()
  return event
}

const panel = () => document.querySelector('[data-testid="project-workspace-link-dialog"]') as HTMLElement
const selectTrigger = () => panel().querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement
const searchInput = () => document.querySelector('input[role="combobox"]') as HTMLInputElement | null

describe('ProjectWorkspaceLinkDialog keyboard journey (AC-011)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workspaceStoreMock.workspaces = {
      [TEMP.workspaceId]: TEMP,
      [LINKED.workspaceId]: LINKED,
      [PROTOTYPE.workspaceId]: PROTOTYPE,
      [MARKETING.workspaceId]: MARKETING,
    }
    workspaceStoreMock.allWorkspaces = [TEMP, LINKED, PROTOTYPE, MARKETING]
    workspaceStoreMock.fetchAllWorkspaces.mockResolvedValue(undefined)
    projectStoreMock.addWorkspace.mockResolvedValue(project)
    wrapper = mount(ProjectWorkspaceLinkDialog, { props: { project }, attachTo: document.body })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('links an existing workspace using only the keyboard', async () => {
    await flushPromises()
    expect(panel().contains(document.activeElement)).toBe(true)

    // Tab reaches the picker trigger inside the dialog; ArrowDown opens the listbox.
    selectTrigger().focus()
    await keydown(selectTrigger(), 'ArrowDown')
    const input = searchInput()!
    expect(document.activeElement).toBe(input)
    const offered = Array.from(document.querySelectorAll('[role="option"]')).map((el) => el.querySelector('.font-medium')?.textContent?.trim())
    expect(offered).toEqual([PROTOTYPE.name, MARKETING.name])

    // Choose the second candidate with the arrow keys and Enter.
    await keydown(input, 'ArrowDown')
    await keydown(input, 'Enter')
    expect(document.activeElement).toBe(selectTrigger())
    expect(panel().contains(document.activeElement)).toBe(true)
    expect(selectTrigger().textContent).toContain(MARKETING.name)

    // Describe it and activate Save.
    const description = panel().querySelector('[data-testid="project-link-description-input"]') as HTMLTextAreaElement
    description.focus()
    description.value = 'Marketing workspace'
    description.dispatchEvent(new Event('input'))
    await flushPromises()
    const submit = panel().querySelector('[data-testid="project-link-submit"]') as HTMLButtonElement
    expect(submit.disabled).toBe(false)
    submit.focus()
    submit.click()
    await flushPromises()

    expect(projectStoreMock.addWorkspace).toHaveBeenCalledWith('p1', MARKETING.workspaceId, 'Marketing workspace')
    expect(wrapper!.emitted('saved')).toHaveLength(1)
  })

  it('closes only the listbox on Escape, then Escape on the trigger closes the dialog', async () => {
    selectTrigger().focus()
    await keydown(selectTrigger(), 'ArrowDown')

    await keydown(searchInput()!, 'Escape')
    expect(searchInput()).toBeNull()
    expect(document.activeElement).toBe(selectTrigger())
    expect(wrapper!.emitted('close')).toBeUndefined()

    await keydown(selectTrigger(), 'Escape')
    expect(wrapper!.emitted('close')).toHaveLength(1)
  })

  it('returns focus into the dialog focus trap on Tab from the listbox', async () => {
    selectTrigger().focus()
    await keydown(selectTrigger(), 'ArrowDown')

    await keydown(searchInput()!, 'Tab')
    expect(searchInput()).toBeNull()
    expect(document.activeElement).toBe(selectTrigger())

    // From here the dialog's own trap owns Tab: Shift+Tab from the first control wraps to the last.
    const first = panel().querySelector('button:not([disabled])') as HTMLButtonElement
    first.focus()
    await keydown(first, 'Tab', { shiftKey: true })
    expect(panel().contains(document.activeElement)).toBe(true)
  })
})
