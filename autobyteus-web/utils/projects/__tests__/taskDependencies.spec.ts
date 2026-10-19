import { describe, expect, it } from 'vitest'
import type { ProjectTask, ProjectTaskStatus } from '~/types/project'
import { dependenciesOf, dependencyBadgeOf, dependencyCycleIds, requiredByOf, taskKeyNumber } from '../taskDependencies'

const task = (n: number, status: ProjectTaskStatus = 'TODO', dependsOnTaskIds: string[] = [], prefix = 'autobyteus'): ProjectTask => ({
  taskId: `t${n}`, projectId: 'p1', taskKey: `${prefix}-${n}`, description: `Task ${n}`, status, dependsOnTaskIds,
  contextFiles: [], createdAt: '', updatedAt: '', root: null,
})

describe('taskDependencies (derived, never stored)', () => {
  it('reads the number after the last "-", also for suffixed prefixes', () => {
    expect(taskKeyNumber({ taskKey: 'autobyteus-42' })).toBe(42)
    expect(taskKeyNumber({ taskKey: 'autobyteus-2-7' })).toBe(7)
    expect(taskKeyNumber({ taskKey: '客户门户-3' })).toBe(3)
  })

  it('lists existing dependencies in key order (Done included) and ignores IDs that name no current Task', () => {
    const tasks = [task(39, 'IN_PROGRESS'), task(28, 'DONE'), task(38), task(41, 'TODO', ['t39', 'gone', 't28', 't38'])]
    expect(dependenciesOf(tasks[3]!, tasks).map((t) => t.taskKey)).toEqual(['autobyteus-28', 'autobyteus-38', 'autobyteus-39'])
    expect(requiredByOf(tasks[1]!, tasks).map((t) => t.taskKey)).toEqual(['autobyteus-41'])
    expect(requiredByOf(tasks[3]!, tasks)).toEqual([])
  })

  it('blocked: the lowest open key first, +N for the other open ones, every dependency in the hover list', () => {
    const tasks = [task(39, 'IN_PROGRESS'), task(38), task(31, 'CANCELLED'), task(28, 'DONE'), task(41, 'TODO', ['t39', 't38', 't31', 't28'])]
    const badge = dependencyBadgeOf(tasks[4]!, tasks)!
    expect(badge).toMatchObject({ kind: 'blocked', first: { taskKey: 'autobyteus-38' }, more: 1 })
    expect(badge.all.map((t) => t.taskKey)).toEqual(['autobyteus-28', 'autobyteus-31', 'autobyteus-38', 'autobyteus-39'])
  })

  it('cancelled only when nothing is open; nothing when all are Done; never on Done or Cancelled Tasks', () => {
    const cancelled = [task(31, 'CANCELLED'), task(30, 'CANCELLED'), task(28, 'DONE'), task(41, 'IN_PROGRESS', ['t31', 't30', 't28'])]
    expect(dependencyBadgeOf(cancelled[3]!, cancelled)).toMatchObject({ kind: 'cancelled', first: { taskKey: 'autobyteus-30' }, more: 1 })
    const done = [task(28, 'DONE'), task(41, 'TODO', ['t28'])]
    expect(dependencyBadgeOf(done[1]!, done)).toBeNull()
    const open = [task(1), task(2, 'DONE', ['t1']), task(3, 'CANCELLED', ['t1'])]
    expect(dependencyBadgeOf(open[1]!, open)).toBeNull()
    expect(dependencyBadgeOf(open[2]!, open)).toBeNull()
    expect(dependencyBadgeOf(task(4, 'TODO', ['deleted']), [task(4, 'TODO', ['deleted'])])).toBeNull()
  })

  it('loop set: the Task itself and everything that depends on it, directly or not', () => {
    const tasks = [task(1), task(2, 'TODO', ['t1']), task(3, 'TODO', ['t2']), task(4), task(5, 'TODO', ['t4'])]
    expect([...dependencyCycleIds('t1', tasks)].sort()).toEqual(['t1', 't2', 't3'])
    expect(dependencyCycleIds(undefined, tasks).size).toBe(0)
  })
})
