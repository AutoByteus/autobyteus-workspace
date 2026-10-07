import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectTaskRow from '../ProjectTaskRow.vue'
import type { ProjectTask, TaskWithoutProject } from '~/types/project'
import { TASK_CARD_TEXT_MAX_CHARS, TASK_SUMMARY_LABEL_MAX_CHARS } from '~/utils/projects/taskSummary'

const words = (count: number, prefix = 'word') => Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ')
const projectTask = (description: string): ProjectTask => ({ taskId: 't1', projectId: 'p1', description, status: 'TODO', contextFiles: [],
  createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z', root: null })
const tempTask = (description: string): TaskWithoutProject => ({ taskId: 'x1', description, status: 'TODO', referenceFiles: [],
  createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z', root: null })
const mountRow = (task: ProjectTask | TaskWithoutProject) => mount(ProjectTaskRow, { props: { task }, global: { stubs: { NuxtLink: RouterLinkStub } } })

describe('ProjectTaskRow card text (task-card-compact-summary)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([['Project board', projectTask], ['Temp tasks', tempTask]] as const)('%s: a ~10,000-word paragraph renders a bounded summary, no preview, and a short accessible name', (_board, make) => {
    const wrapper = mountRow(make(words(10_000)))
    const text = wrapper.get('[data-testid="project-task-row-text"]')
    expect(text.text().length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
    expect(text.text().endsWith('…')).toBe(true)
    expect(wrapper.find('[data-testid="project-task-row-preview"]').exists()).toBe(false)
    const name = wrapper.get('[data-testid="project-task-row-link"]').attributes('aria-label')!
    expect(name.length).toBeLessThanOrEqual(TASK_SUMMARY_LABEL_MAX_CHARS)
    expect(name.endsWith('…')).toBe(true)
  })

  it('a long multi-line description renders a bounded summary and a bounded preview', () => {
    const wrapper = mountRow(projectTask(`${words(500, 'lead')}\n${words(5000, 'detail')}`))
    expect(wrapper.get('[data-testid="project-task-row-text"]').text().length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
    const preview = wrapper.get('[data-testid="project-task-row-preview"]')
    expect(preview.text()).toMatch(/^detail0 detail1 /)
    expect(preview.text().length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
  })

  it('the clamped spans carry no display utility that overrides line-clamp (the root cause)', () => {
    const wrapper = mountRow(projectTask('Summary\nPreview'))
    for (const testId of ['project-task-row-text', 'project-task-row-preview']) {
      const classes = wrapper.get(`[data-testid="${testId}"]`).classes()
      expect(classes).toContain('line-clamp-2')
      expect(classes.filter((name) => ['block', 'inline', 'inline-block', 'flex', 'grid'].includes(name))).toEqual([])
    }
  })

  it('short descriptions render as before: full summary, preview and accessible name (AC-006)', () => {
    const wrapper = mountRow(projectTask('Write the release notes.\nKeep it short.'))
    expect(wrapper.get('[data-testid="project-task-row-text"]').text()).toBe('Write the release notes.')
    expect(wrapper.get('[data-testid="project-task-row-preview"]').text()).toBe('Keep it short.')
    expect(wrapper.get('[data-testid="project-task-row-link"]').attributes('aria-label')).toBe('Write the release notes.')
  })
})
