import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import SkillSourceRow from './SkillSourceRow.vue'
import type { SkillSource } from '~/stores/skillSourcesStore'

type GitHubState = NonNullable<SkillSource['github']>
type GitHubStatus = GitHubState['status']

const folder = (overrides: Partial<SkillSource> = {}): SkillSource => ({
  sourceId: 'local', sourceKind: 'LOCAL_PATH', github: null,
  path: '/Users/a/.codex/skills', skillCount: 4, isDefault: false, ...overrides,
})

const githubSource = (status: GitHubStatus, overrides: Partial<GitHubState> = {}): SkillSource => ({
  sourceId: 'remote', sourceKind: 'GITHUB_REPOSITORY', path: '/managed/g1', skillCount: 2, isDefault: false,
  github: {
    repositoryUrl: 'https://github.com/acme/docs-skills', defaultBranch: 'main',
    installedRevision: 'a'.repeat(40), latestRevision: 'b'.repeat(40), latestCheckedAt: '2026-10-10T08:30:00.000Z',
    status, lastError: null, ...overrides,
  },
})

const mountRow = (source: SkillSource, props: { pending?: string; disabled?: boolean } = {}) =>
  mount(SkillSourceRow, { props: { source, disabled: false, ...props } })

const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(b => b.attributes('aria-label') === label || b.text() === label)

const visibleText = (wrapper: VueWrapper) => {
  const clone = wrapper.element.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.sr-only').forEach(node => node.remove())
  return clone.textContent ?? ''
}

describe('SkillSourceRow', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('row content (AC-001)', () => {
    it('leads with the display name and count, with the full path secondary and in the tooltip', () => {
      const wrapper = mountRow(folder())
      expect(wrapper.text()).toContain('.codex/skills')
      expect(wrapper.text()).toContain('4 skills')
      const path = wrapper.findAll('span').find(s => s.text() === '/Users/a/.codex/skills')!
      expect(path.attributes('title')).toBe('/Users/a/.codex/skills')
      expect(button(wrapper, 'Copy path')).toBeDefined()
    })

    it('names GitHub sources owner/repository and shows the URL as the location', () => {
      const wrapper = mountRow(githubSource('UP_TO_DATE'))
      expect(wrapper.text()).toContain('acme/docs-skills')
      const url = wrapper.findAll('span').find(s => s.text() === 'https://github.com/acme/docs-skills')!
      expect(url.attributes('title')).toBe('https://github.com/acme/docs-skills')
      expect(wrapper.text()).not.toContain('/managed/g1')
      expect(button(wrapper, 'Copy URL')).toBeDefined()
    })

    it('keeps the kind for screen readers only', () => {
      const local = mountRow(folder())
      expect(local.find('.sr-only').text()).toBe('Local folder')
      expect(visibleText(local)).not.toContain('Local folder')

      const remote = mountRow(githubSource('UP_TO_DATE'))
      expect(remote.find('.sr-only').text()).toBe('GitHub')
      expect(visibleText(remote)).not.toMatch(/\bGitHub\b/)
    })

    it('marks the Default source with a badge and never offers removal', () => {
      const wrapper = mountRow(folder({ sourceId: 'default', sourceKind: 'DEFAULT', isDefault: true, path: '/home/a/.autobyteus/server-data/skills' }))
      expect(wrapper.text()).toContain('server-data/skills')
      expect(visibleText(wrapper)).toContain('Default')
      expect(wrapper.findAll('button').some(b => b.attributes('aria-label')?.startsWith('Remove'))).toBe(false)
    })
  })

  describe('skill count (AC-002)', () => {
    it.each([
      [0, 'No skills'],
      [1, '1 skill'],
      [7, '7 skills'],
    ])('labels %i skills as "%s"', (skillCount, label) => {
      const wrapper = mountRow(folder({ skillCount }))
      expect(wrapper.text()).toContain(label)
    })

    it('explains an empty source in the count tooltip', () => {
      const wrapper = mountRow(folder({ skillCount: 0 }))
      const count = wrapper.findAll('span').find(s => s.text() === 'No skills')!
      expect(count.attributes('title')).toContain('A source needs a SKILL.md at its root')
      const counted = mountRow(folder({ skillCount: 3 })).findAll('span').find(s => s.text() === '3 skills')!
      expect(counted.attributes('title')).toBeUndefined()
    })
  })

  describe('remove (AC-003)', () => {
    it('emits remove from the named trash button', async () => {
      const wrapper = mountRow(folder())
      await button(wrapper, 'Remove .codex/skills')!.trigger('click')
      expect(wrapper.emitted('remove')).toHaveLength(1)
    })
  })

  describe('GitHub status line (AC-006)', () => {
    it.each<[GitHubStatus, string, { update: boolean; tryAgain: boolean; retryRemoval: boolean; trash: boolean }]>([
      ['NOT_CHECKED', 'Not checked', { update: false, tryAgain: false, retryRemoval: false, trash: true }],
      ['UP_TO_DATE', 'Up to date', { update: false, tryAgain: false, retryRemoval: false, trash: true }],
      ['UPDATE_AVAILABLE', 'Update available', { update: true, tryAgain: false, retryRemoval: false, trash: true }],
      ['CHECK_FAILED', 'Check failed — installed skills retained', { update: false, tryAgain: true, retryRemoval: false, trash: true }],
      ['UPDATE_FAILED', 'Update failed — previous version retained', { update: true, tryAgain: false, retryRemoval: false, trash: true }],
      ['REMOVING', 'Removal incomplete', { update: false, tryAgain: false, retryRemoval: true, trash: false }],
    ])('%s shows "%s" with only its own actions', (status, label, actions) => {
      const wrapper = mountRow(githubSource(status))
      expect(wrapper.get('[role="status"]').text()).toBe(label)
      expect(!!button(wrapper, 'Update')).toBe(actions.update)
      expect(!!button(wrapper, 'Check acme/docs-skills again')).toBe(actions.tryAgain)
      expect(!!button(wrapper, 'Retry removal')).toBe(actions.retryRemoval)
      expect(!!button(wrapper, 'Remove acme/docs-skills')).toBe(actions.trash)
    })

    it.each<[GitHubStatus, string]>([
      ['UPDATE_AVAILABLE', 'Update'],
      ['UPDATE_FAILED', 'Update'],
      ['REMOVING', 'Retry removal'],
    ])('%s shows the %s chip as its label only, with no icon (SR-003)', (status, label) => {
      const chip = button(mountRow(githubSource(status)), label)!
      expect(chip.text()).toBe(label)
      expect(chip.element.children).toHaveLength(0)
    })

    it('keeps version details off the row and in the status tooltip', () => {
      const wrapper = mountRow(githubSource('UPDATE_AVAILABLE'))
      const tooltip = wrapper.get('[role="status"]').attributes('title')!
      expect(tooltip).toContain(`Installed ${'a'.repeat(10)} · main`)
      expect(tooltip).toContain(`Latest ${'b'.repeat(10)}`)
      expect(tooltip).toMatch(/Checked \S/)
      expect(wrapper.text()).not.toContain('a'.repeat(10))
      expect(wrapper.text()).not.toContain('b'.repeat(10))
    })

    it('omits latest and checked details that are not known yet', () => {
      const wrapper = mountRow(githubSource('NOT_CHECKED', { latestRevision: null, latestCheckedAt: null }))
      expect(wrapper.get('[role="status"]').attributes('title')).toBe(`Installed ${'a'.repeat(10)} · main`)
    })

    it('shows the last error below the status', () => {
      const wrapper = mountRow(githubSource('CHECK_FAILED', { lastError: 'GitHub rate limit reached' }))
      expect(wrapper.text()).toContain('GitHub rate limit reached')
    })

    it('emits the intent of each GitHub action', async () => {
      const update = mountRow(githubSource('UPDATE_AVAILABLE'))
      await button(update, 'Update')!.trigger('click')
      expect(update.emitted('update')).toHaveLength(1)

      const check = mountRow(githubSource('CHECK_FAILED'))
      await button(check, 'Check acme/docs-skills again')!.trigger('click')
      expect(check.emitted('check')).toHaveLength(1)
      expect(button(check, 'Check acme/docs-skills again')!.text()).toBe('Try again')

      const removing = mountRow(githubSource('REMOVING'))
      await button(removing, 'Retry removal')!.trigger('click')
      expect(removing.emitted('remove')).toHaveLength(1)
    })

    it.each([
      ['check', 'Checking…'],
      ['update', 'Updating…'],
      ['remove', 'Removing…'],
    ])('shows the pending %s operation and marks the row busy', (pending, label) => {
      const wrapper = mountRow(githubSource('UPDATE_AVAILABLE'), { pending, disabled: true })
      expect(wrapper.get('[role="status"]').text()).toBe(label)
      expect(wrapper.attributes('aria-busy')).toBe('true')
    })

    it('disables every action while an operation runs, but not copy', () => {
      const wrapper = mountRow(githubSource('UPDATE_FAILED'), { disabled: true })
      expect(button(wrapper, 'Update')!.attributes('disabled')).toBeDefined()
      expect(button(wrapper, 'Remove acme/docs-skills')!.attributes('disabled')).toBeDefined()
      expect(button(wrapper, 'Copy URL')!.attributes('disabled')).toBeUndefined()
    })
  })

  describe('copy', () => {
    it('copies the full location and confirms for 1.5 s', async () => {
      vi.useFakeTimers()
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
      const wrapper = mountRow(githubSource('UP_TO_DATE'))

      await button(wrapper, 'Copy URL')!.trigger('click')
      await Promise.resolve()
      await wrapper.vm.$nextTick()
      expect(writeText).toHaveBeenCalledWith('https://github.com/acme/docs-skills')
      expect(button(wrapper, 'Copied')).toBeDefined()

      vi.advanceTimersByTime(1500)
      await wrapper.vm.$nextTick()
      expect(button(wrapper, 'Copy URL')).toBeDefined()
    })
  })
})
