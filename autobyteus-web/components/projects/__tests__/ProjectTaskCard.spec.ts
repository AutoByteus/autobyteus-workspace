import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectTaskCard from '../ProjectTaskCard.vue'
import type { ProjectTask } from '~/types/project'

const task: ProjectTask = {
  taskId: 't1',
  projectId: 'p1',
  description: 'Write release notes for 1.4.87\nInclude Projects and Tasks\nand the board',
  status: 'TODO',
  createdAt: '2026-09-27T00:00:00.000Z',
  updatedAt: '2026-09-27T00:00:00.000Z',
}

describe('ProjectTaskCard', () => {
  it('shows only the description, clamped to three lines, named by its summary', () => {
    const wrapper = mount(ProjectTaskCard, { props: { task } })

    const button = wrapper.get('button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('Write release notes for 1.4.87')
    const text = wrapper.get('[data-testid="project-task-card-text"]')
    expect(text.text()).toBe(task.description)
    expect(text.classes()).toEqual(expect.arrayContaining(['line-clamp-3', 'whitespace-pre-line', 'break-words']))
    // No status label, timestamp, icon, drag handle or move control.
    expect(wrapper.text()).not.toMatch(/To Do|ago|just now/)
    expect(wrapper.findAll('svg, img, time, [draggable="true"], select')).toHaveLength(0)
    expect(button.attributes('draggable')).toBeUndefined()
  })

  it('opens on click (Enter and Space activate the native button)', async () => {
    const wrapper = mount(ProjectTaskCard, { props: { task } })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual([task])
  })
})
