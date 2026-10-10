import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import SkillSourcesModal from './SkillSourcesModal.vue'
import { useSkillSourcesStore, type SkillSource } from '~/stores/skillSourcesStore'
import { useSkillStore } from '~/stores/skillStore'
import { useSkillNamesStore } from '~/stores/skillNamesStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

type GitHubState = NonNullable<SkillSource['github']>

const githubSource = (status: GitHubState['status'], overrides: Partial<GitHubState> = {}): SkillSource => ({
  sourceId: 'remote', sourceKind: 'GITHUB_REPOSITORY', path: '/managed/g1', skillCount: 1, isDefault: false,
  github: {
    repositoryUrl: 'https://github.com/acme/skills', defaultBranch: 'main', installedRevision: 'a'.repeat(40),
    latestRevision: 'b'.repeat(40), latestCheckedAt: null, status, lastError: null, ...overrides,
  },
})

const ConfirmationModalStub = {
  props: ['show', 'title', 'confirmButtonText', 'pending'],
  emits: ['confirm', 'cancel'],
  template: `
    <div v-if="show" data-testid="confirmation">
      <h3>{{ title }}</h3><slot />
      <button data-testid="confirm" @click="$emit('confirm')">{{ confirmButtonText }}</button>
      <button data-testid="cancel" @click="$emit('cancel')">Cancel</button>
    </div>
  `,
}

const mounted: VueWrapper[] = []

const mountComponent = async (options: { extraSources?: SkillSource[]; nodeId?: string } = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      skillSources: {
        skillSources: [
          { sourceId: 'local', sourceKind: 'LOCAL_PATH', github: null, path: '/custom/skills', skillCount: 2, isDefault: false },
          { sourceId: 'default', sourceKind: 'DEFAULT', github: null, path: '/default/skills', skillCount: 3, isDefault: true },
          ...(options.extraSources ?? []),
        ],
        loading: false,
        error: '',
      },
      skill: { skills: [], loading: false, error: '' },
      ...(options.nodeId ? { windowNodeContext: { nodeId: options.nodeId } } : {}),
    },
  })
  setActivePinia(pinia)

  const sourcesStore = useSkillSourcesStore()
  const skillStore = useSkillStore()
  const skillNames = useSkillNamesStore()
  sourcesStore.fetchSkillSources = vi.fn().mockResolvedValue(undefined)
  sourcesStore.checkGitHubSources = vi.fn().mockResolvedValue(undefined)
  sourcesStore.addSkillSource = vi.fn().mockResolvedValue(undefined)
  sourcesStore.removeSkillSource = vi.fn().mockResolvedValue(undefined)
  sourcesStore.githubOperation = vi.fn().mockResolvedValue(undefined) as typeof sourcesStore.githubOperation
  skillStore.fetchAllSkills = vi.fn().mockResolvedValue(undefined)
  skillNames.fetchIssues = vi.fn().mockResolvedValue([])
  skillNames.runWithSkillNameChecks = vi.fn((action: () => Promise<unknown>) => action()) as typeof skillNames.runWithSkillNameChecks

  const wrapper = mount(SkillSourcesModal, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: { ConfirmationModal: ConfirmationModalStub } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, sourcesStore, skillStore, skillNames }
}

const byLabel = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(b => b.attributes('aria-label') === label || b.text() === label)
const input = (wrapper: VueWrapper) => wrapper.get('#skill-source-input')
const inputValue = (wrapper: VueWrapper) => (input(wrapper).element as HTMLInputElement).value
const addButton = (wrapper: VueWrapper) => wrapper.get('button[type="submit"]')
const hint = (wrapper: VueWrapper) => wrapper.get('#skill-source-hint').text()
const submit = async (wrapper: VueWrapper, value: string) => {
  await input(wrapper).setValue(value)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}
const confirmation = (wrapper: VueWrapper) => wrapper.find('[data-testid="confirmation"]')

describe('SkillSourcesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    mounted.splice(0).forEach(wrapper => wrapper.unmount())
    Reflect.deleteProperty(window, 'electronAPI')
  })

  describe('opening and list', () => {
    it('loads sources, then checks GitHub sources automatically on every open', async () => {
      const { sourcesStore } = await mountComponent()
      expect(sourcesStore.fetchSkillSources).toHaveBeenCalledOnce()
      expect(sourcesStore.checkGitHubSources).toHaveBeenCalledOnce()
      expect(vi.mocked(sourcesStore.fetchSkillSources).mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(sourcesStore.checkGitHubSources).mock.invocationCallOrder[0]!)
    })

    it('lists Default first, then by path, in a labelled list', async () => {
      const { wrapper } = await mountComponent({ extraSources: [githubSource('UP_TO_DATE')] })
      const list = wrapper.get('ul[aria-label="Skill sources"]')
      const ids = list.findAll('li[data-testid^="skill-source-row-"]').map(row => row.attributes('data-testid'))
      expect(ids).toEqual(['skill-source-row-default', 'skill-source-row-local', 'skill-source-row-remote'])
    })

    it('shows the loading line until the first load completes', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      sourcesStore.skillSources = []
      sourcesStore.loading = true
      await flushPromises()
      expect(wrapper.text()).toContain('Loading sources')
    })

    it('shows the registry error above the add form', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      sourcesStore.registryError = 'Skill source registry is unreadable'
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toContain('Skill source registry is unreadable')
    })
  })

  describe('remove (AC-003)', () => {
    it('offers no trash button on the Default source', async () => {
      const { wrapper } = await mountComponent()
      expect(byLabel(wrapper, 'Remove default/skills')).toBeUndefined()
      expect(wrapper.get('[data-testid="skill-source-row-default"]').findAll('button')
        .some(b => b.attributes('aria-label')?.startsWith('Remove'))).toBe(false)
    })

    it('unlinks a local folder after confirmation and refreshes the catalog', async () => {
      const { wrapper, sourcesStore, skillStore, skillNames } = await mountComponent()
      await byLabel(wrapper, 'Remove custom/skills')!.trigger('click')

      expect(confirmation(wrapper).text()).toContain('Remove Skill Source')
      expect(confirmation(wrapper).text()).toContain('Unlink this local source?')
      expect(confirmation(wrapper).text()).toContain('/custom/skills')
      await wrapper.get('[data-testid="confirm"]').trigger('click')
      await flushPromises()

      expect(skillNames.runWithSkillNameChecks).toHaveBeenCalledOnce()
      expect(sourcesStore.removeSkillSource).toHaveBeenCalledWith('/custom/skills')
      expect(sourcesStore.githubOperation).not.toHaveBeenCalled()
      expect(skillStore.fetchAllSkills).toHaveBeenCalledOnce()
      expect(skillNames.fetchIssues).toHaveBeenCalledOnce()
      expect(wrapper.text()).toContain('Skill source removed. Skills list refreshed.')
      expect(confirmation(wrapper).exists()).toBe(false)
    })

    it('makes no call when the removal is cancelled', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      await byLabel(wrapper, 'Remove custom/skills')!.trigger('click')
      await wrapper.get('[data-testid="cancel"]').trigger('click')
      await flushPromises()
      expect(confirmation(wrapper).exists()).toBe(false)
      expect(sourcesStore.removeSkillSource).not.toHaveBeenCalled()
      expect(sourcesStore.githubOperation).not.toHaveBeenCalled()
    })

    it('deletes the managed copy of a GitHub source after confirmation', async () => {
      const { wrapper, sourcesStore } = await mountComponent({ extraSources: [githubSource('UP_TO_DATE')] })
      await byLabel(wrapper, 'Remove acme/skills')!.trigger('click')
      expect(confirmation(wrapper).text()).toContain('Delete this downloaded skill source and any local edits')
      expect(confirmation(wrapper).text()).toContain('https://github.com/acme/skills')
      await wrapper.get('[data-testid="confirm"]').trigger('click')
      await flushPromises()
      expect(sourcesStore.githubOperation).toHaveBeenCalledWith('remove', 'remote')
      expect(sourcesStore.removeSkillSource).not.toHaveBeenCalled()
    })

    it('retries an incomplete removal through the same confirmation', async () => {
      const { wrapper, sourcesStore } = await mountComponent({
        extraSources: [githubSource('REMOVING', { lastError: 'permission denied' })],
      })
      expect(wrapper.text()).toContain('permission denied')
      expect(byLabel(wrapper, 'Remove acme/skills')).toBeUndefined()
      await byLabel(wrapper, 'Retry removal')!.trigger('click')
      expect(confirmation(wrapper).text()).toContain('Delete this downloaded skill source')
      await wrapper.get('[data-testid="confirm"]').trigger('click')
      await flushPromises()
      expect(sourcesStore.githubOperation).toHaveBeenCalledWith('remove', 'remote')
    })
  })

  describe('add (AC-004)', () => {
    it('adds a folder path through the skill-name checks, then clears the input and refreshes', async () => {
      const { wrapper, sourcesStore, skillStore, skillNames } = await mountComponent()
      await submit(wrapper, '  /extra/skills  ')

      expect(skillNames.runWithSkillNameChecks).toHaveBeenCalledOnce()
      expect(sourcesStore.addSkillSource).toHaveBeenCalledWith('/extra/skills')
      expect(sourcesStore.githubOperation).not.toHaveBeenCalled()
      expect(inputValue(wrapper)).toBe('')
      expect(wrapper.text()).toContain('Source is available. Skills list refreshed.')
      expect(skillStore.fetchAllSkills).toHaveBeenCalledOnce()
    })

    it.each([
      'https://github.com/acme/skills',
      'http://github.com/acme/skills',
      'www.github.com/acme/skills',
      'github.com/acme/skills',
      'HTTPS://GitHub.com/acme/skills',
      'https://gitlab.com/acme/skills',
    ])('imports %s as a GitHub repository through the skill-name checks', async (url) => {
      const { wrapper, sourcesStore, skillNames } = await mountComponent()
      await submit(wrapper, ` ${url} `)
      expect(skillNames.runWithSkillNameChecks).toHaveBeenCalledOnce()
      expect(sourcesStore.githubOperation).toHaveBeenCalledWith('import', undefined, url)
      expect(sourcesStore.addSkillSource).not.toHaveBeenCalled()
      expect(inputValue(wrapper)).toBe('')
    })

    it('treats a scheme-less non-GitHub host as a folder path', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      await submit(wrapper, 'gitlab.com/acme/skills')
      expect(sourcesStore.addSkillSource).toHaveBeenCalledWith('gitlab.com/acme/skills')
      expect(sourcesStore.githubOperation).not.toHaveBeenCalled()
    })

    it('shows the trust warning only while a repository URL is typed', async () => {
      const { wrapper } = await mountComponent()
      expect(hint(wrapper)).toContain('A folder on this computer that contains skills')
      await input(wrapper).setValue('https://github.com/acme/skills')
      expect(hint(wrapper)).toContain('Import only sources you trust')
      await input(wrapper).setValue('/Users/a/skills')
      expect(hint(wrapper)).toContain('A folder on this computer that contains skills')
      expect(input(wrapper).attributes('aria-describedby')).toBe('skill-source-hint')
      expect(wrapper.get('#skill-source-hint').attributes('aria-live')).toBe('polite')
    })

    it('enables Add only for a non-blank value', async () => {
      const { wrapper } = await mountComponent()
      expect(addButton(wrapper).attributes('disabled')).toBeDefined()
      await input(wrapper).setValue('   ')
      expect(addButton(wrapper).attributes('disabled')).toBeDefined()
      await input(wrapper).setValue('/x')
      expect(addButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('keeps the typed value and shows no success when the operation fails', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      sourcesStore.addSkillSource = vi.fn().mockRejectedValue(new Error('Duplicate skill names: dup'))
      await submit(wrapper, '/dup/skills')
      expect(inputValue(wrapper)).toBe('/dup/skills')
      expect(wrapper.text()).not.toContain('Source is available')

      sourcesStore.githubOperation = vi.fn().mockRejectedValue(new Error('not a repository root')) as typeof sourcesStore.githubOperation
      await submit(wrapper, 'https://github.com/acme/skills/tree/main')
      expect(inputValue(wrapper)).toBe('https://github.com/acme/skills/tree/main')
      expect(wrapper.text()).not.toContain('Source is available')
    })

    it('disables the input and Add while the operation runs', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      let finish!: () => void
      sourcesStore.addSkillSource = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
      await input(wrapper).setValue('/slow/skills')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(addButton(wrapper).text()).toContain('Working…')
      expect(addButton(wrapper).attributes('disabled')).toBeDefined()
      expect(input(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.get('[role="dialog"]').attributes('aria-busy')).toBe('true')
      finish()
      await flushPromises()
      expect(addButton(wrapper).text()).toContain('Add')
    })

    it('hides Browse… where the desktop folder picker is unavailable', async () => {
      const browser = await mountComponent()
      expect(byLabel(browser.wrapper, 'Browse…')).toBeUndefined()

      Object.defineProperty(window, 'electronAPI', { configurable: true, value: { showFolderDialog: vi.fn() } })
      const remoteNode = await mountComponent({ nodeId: 'remote-node' })
      expect(byLabel(remoteNode.wrapper, 'Browse…')).toBeUndefined()
    })

    it('fills the input from Browse… without submitting', async () => {
      const showFolderDialog = vi.fn().mockResolvedValue({ canceled: false, path: '/picked/skills' })
      Object.defineProperty(window, 'electronAPI', { configurable: true, value: { showFolderDialog } })
      const { wrapper, sourcesStore } = await mountComponent()

      await byLabel(wrapper, 'Browse…')!.trigger('click')
      await flushPromises()

      expect(showFolderDialog).toHaveBeenCalledOnce()
      expect(inputValue(wrapper)).toBe('/picked/skills')
      expect(document.activeElement).toBe(input(wrapper).element)
      expect(sourcesStore.addSkillSource).not.toHaveBeenCalled()
      expect(sourcesStore.githubOperation).not.toHaveBeenCalled()
    })

    it('keeps the typed value when Browse… is cancelled', async () => {
      const showFolderDialog = vi.fn().mockResolvedValue({ canceled: true, path: null })
      Object.defineProperty(window, 'electronAPI', { configurable: true, value: { showFolderDialog } })
      const { wrapper } = await mountComponent()
      await input(wrapper).setValue('/typed')
      await byLabel(wrapper, 'Browse…')!.trigger('click')
      await flushPromises()
      expect(inputValue(wrapper)).toBe('/typed')
    })
  })

  describe('GitHub maintenance (AC-006)', () => {
    it('confirms an update with the version change and supports cancellation', async () => {
      const { wrapper, sourcesStore, skillStore } = await mountComponent({ extraSources: [githubSource('UPDATE_AVAILABLE')] })
      await byLabel(wrapper, 'Update')!.trigger('click')

      const dialog = confirmation(wrapper)
      expect(dialog.text()).toContain('Update entire skill source?')
      expect(dialog.text()).toContain('Local edits will be overwritten')
      expect(dialog.text()).toContain('acme/skills')
      expect(dialog.text()).toContain('main')
      expect(dialog.text()).toContain('a'.repeat(10))
      expect(dialog.text()).toContain('b'.repeat(10))
      await wrapper.get('[data-testid="cancel"]').trigger('click')
      expect(sourcesStore.githubOperation).not.toHaveBeenCalled()

      await byLabel(wrapper, 'Update')!.trigger('click')
      await wrapper.get('[data-testid="confirm"]').trigger('click')
      await flushPromises()
      expect(sourcesStore.githubOperation).toHaveBeenCalledWith('update', 'remote')
      expect(skillStore.fetchAllSkills).toHaveBeenCalledOnce()
      expect(wrapper.text()).toContain('Source is up to date. Skills list refreshed.')
    })

    it('keeps the version change out of the remove confirmation', async () => {
      const { wrapper } = await mountComponent({ extraSources: [githubSource('UPDATE_AVAILABLE')] })
      await byLabel(wrapper, 'Remove acme/skills')!.trigger('click')
      expect(confirmation(wrapper).text()).not.toContain('b'.repeat(10))
    })

    it('offers Try again only after a failed check and runs a check', async () => {
      const failed = await mountComponent({ extraSources: [githubSource('CHECK_FAILED', { lastError: 'rate limited' })] })
      await byLabel(failed.wrapper, 'Check acme/skills again')!.trigger('click')
      await flushPromises()
      expect(failed.sourcesStore.githubOperation).toHaveBeenCalledWith('check', 'remote')

      for (const status of ['UP_TO_DATE', 'UPDATE_AVAILABLE', 'UPDATE_FAILED', 'NOT_CHECKED', 'REMOVING'] as const) {
        const { wrapper } = await mountComponent({ extraSources: [githubSource(status)] })
        expect(byLabel(wrapper, 'Check acme/skills again'), status).toBeUndefined()
      }
    })

    it('disables every row action and the add form while a source operation runs', async () => {
      const { wrapper, sourcesStore } = await mountComponent({ extraSources: [githubSource('UPDATE_AVAILABLE')] })
      sourcesStore.pending.remote = 'update'
      await flushPromises()
      expect(wrapper.text()).toContain('Updating…')
      for (const label of ['Update', 'Remove acme/skills', 'Remove custom/skills']) {
        expect(byLabel(wrapper, label)!.attributes('disabled'), label).toBeDefined()
      }
      expect(input(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.get('[role="dialog"]').attributes('aria-busy')).toBe('true')
    })
  })

  describe('closing, focus and accessibility (AC-007)', () => {
    it('labels the dialog and its icon buttons', async () => {
      const { wrapper } = await mountComponent({ extraSources: [githubSource('CHECK_FAILED')] })
      const dialog = wrapper.get('[role="dialog"]')
      expect(dialog.attributes('aria-modal')).toBe('true')
      expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Manage Skill Sources')
      for (const label of ['Close', 'Remove custom/skills', 'Remove acme/skills', 'Copy path', 'Copy URL', 'Check acme/skills again']) {
        expect(byLabel(wrapper, label), label).toBeDefined()
      }
    })

    it.each(['Close', 'Done'])('closes from %s', async (label) => {
      const { wrapper } = await mountComponent()
      await byLabel(wrapper, label)!.trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('closes from a click on the overlay but not inside the panel', async () => {
      const { wrapper } = await mountComponent()
      await wrapper.get('[role="dialog"]').trigger('click')
      expect(wrapper.emitted('close')).toBeUndefined()
      await wrapper.get('.dialog-overlay').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('closes on Escape unless a confirmation is open', async () => {
      const { wrapper } = await mountComponent()
      await byLabel(wrapper, 'Remove custom/skills')!.trigger('click')
      const dialog = wrapper.get('[role="dialog"]')
      expect(dialog.attributes('inert')).toBeDefined()
      await dialog.trigger('keydown', { key: 'Escape' })
      expect(wrapper.emitted('close')).toBeUndefined()

      await wrapper.get('[data-testid="cancel"]').trigger('click')
      expect(dialog.attributes('inert')).toBeUndefined()
      await dialog.trigger('keydown', { key: 'Escape' })
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    // Keys go to the focused element and bubble, as in a browser. The browser moves focus to <body> when the
    // focused control becomes inert, disabled or removed; `dropFocus` reproduces that where happy-dom does not.
    const press = (key: string, init: KeyboardEventInit = {}) =>
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
    const dropFocus = () => (document.activeElement as HTMLElement | null)?.blur()
    const panelOf = (wrapper: VueWrapper) => wrapper.get('[role="dialog"]').element as HTMLElement
    const clickFocused = async (wrapper: VueWrapper, label: string) => {
      const target = byLabel(wrapper, label)!
      ;(target.element as HTMLElement).focus()
      await target.trigger('click')
    }
    // In the browser the confirmation fades out (ConfirmationModal's <Transition>), so focus is still on its
    // button, outside the panel, when the confirmation closes. An element outside the panel stands in for it.
    const focusOutside = () => {
      const outside = document.createElement('button')
      outside.textContent = 'Outside'
      document.body.appendChild(outside)
      outside.focus()
      return outside
    }
    const cancelConfirmation = async (wrapper: VueWrapper) => {
      const leaving = focusOutside()
      await wrapper.get('[data-testid="cancel"]').trigger('click')
      await flushPromises()
      leaving.remove()
    }

    it('returns focus to the trash button after a cancelled confirmation, and Esc then closes', async () => {
      const { wrapper } = await mountComponent()
      await clickFocused(wrapper, 'Remove custom/skills')
      expect(confirmation(wrapper).exists()).toBe(true)
      press('Escape')
      expect(wrapper.emitted('close')).toBeUndefined()

      await cancelConfirmation(wrapper)
      expect(document.activeElement).toBe(byLabel(wrapper, 'Remove custom/skills')!.element)
      press('Escape')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('moves focus to the add input when the confirmed source is gone, and Esc then closes', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      sourcesStore.removeSkillSource = vi.fn(async (path: string) => {
        sourcesStore.skillSources = sourcesStore.skillSources.filter(source => source.path !== path)
      })
      await clickFocused(wrapper, 'Remove custom/skills')
      const leaving = focusOutside()
      await wrapper.get('[data-testid="confirm"]').trigger('click')
      await flushPromises()
      leaving.remove()

      expect(byLabel(wrapper, 'Remove custom/skills')).toBeUndefined()
      expect(document.activeElement).toBe(input(wrapper).element)
      press('Escape')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('returns focus to the add input after an Enter-add disabled it, and Esc then closes', async () => {
      const { wrapper, sourcesStore } = await mountComponent()
      let finish!: () => void
      sourcesStore.addSkillSource = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
      ;(input(wrapper).element as HTMLInputElement).focus()
      await input(wrapper).setValue('/extra/skills')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(input(wrapper).attributes('disabled')).toBeDefined()
      dropFocus()

      finish()
      await flushPromises()
      expect(document.activeElement).toBe(input(wrapper).element)
      expect(panelOf(wrapper).contains(document.activeElement)).toBe(true)
      press('Escape')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('falls back to the add input when Try again disappears after the check', async () => {
      const { wrapper, sourcesStore } = await mountComponent({ extraSources: [githubSource('CHECK_FAILED')] })
      let finish!: () => void
      sourcesStore.githubOperation = vi.fn(async () => {
        sourcesStore.pending = { remote: 'check' }
        await new Promise<void>(resolve => { finish = resolve })
        sourcesStore.skillSources = sourcesStore.skillSources.map(source =>
          source.github ? { ...source, github: { ...source.github, status: 'UP_TO_DATE' as const } } : source)
        sourcesStore.pending = {}
      }) as typeof sourcesStore.githubOperation
      await clickFocused(wrapper, 'Check acme/skills again')
      await flushPromises()
      expect(wrapper.text()).toContain('Checking…')
      dropFocus()
      finish()
      await flushPromises()
      expect(byLabel(wrapper, 'Check acme/skills again')).toBeUndefined()
      expect(document.activeElement).toBe(input(wrapper).element)
    })

    it('brings a stray Tab back into the panel and closes on a stray Esc', async () => {
      const { wrapper } = await mountComponent()
      dropFocus()
      press('Tab')
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Close')
      dropFocus()
      press('Tab', { shiftKey: true })
      expect(document.activeElement?.textContent?.trim()).toBe('Done')
      const outside = focusOutside()
      press('Tab')
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Close')
      outside.focus()
      press('Escape')
      expect(wrapper.emitted('close')).toHaveLength(1)
      outside.remove()
    })

    it('leaves Esc and Tab to the skill-name conflict dialog while it is open, then returns focus', async () => {
      const { wrapper, skillNames } = await mountComponent()
      ;(input(wrapper).element as HTMLInputElement).focus()
      skillNames.conflicts = [{ name: 'dup', existingPath: '/a/dup', incomingPath: '/b/dup' }] as typeof skillNames.conflicts
      await flushPromises()
      dropFocus()
      press('Escape')
      press('Tab')
      expect(wrapper.emitted('close')).toBeUndefined()
      expect(document.activeElement).toBe(document.body)

      skillNames.conflicts = []
      await flushPromises()
      expect(document.activeElement).toBe(input(wrapper).element)
    })

    it('stops listening on the document after unmount', async () => {
      const { wrapper } = await mountComponent()
      mounted.splice(mounted.indexOf(wrapper), 1)
      wrapper.unmount()
      dropFocus()
      press('Escape')
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('moves focus into the dialog, traps Tab, and returns focus to the opener', async () => {
      const opener = document.createElement('button')
      opener.textContent = 'Sources'
      document.body.appendChild(opener)
      opener.focus()

      const { wrapper } = await mountComponent()
      const dialog = wrapper.get('[role="dialog"]').element as HTMLElement
      expect(document.activeElement).toBe(dialog)

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])'))
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      expect(first.getAttribute('aria-label')).toBe('Close')
      expect(last.textContent?.trim()).toBe('Done')

      last.focus()
      await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Tab' })
      expect(document.activeElement).toBe(first)
      await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(last)

      mounted.splice(mounted.indexOf(wrapper), 1)
      wrapper.unmount()
      expect(document.activeElement).toBe(opener)
      opener.remove()
    })
  })
})
