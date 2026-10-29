import { describe, expect, it } from 'vitest'
import type { ProjectTask, ProjectTaskStatus } from '~/types/project'
import { parentOf, partOfBlockedIds, partsOf, partsProgressOf } from '../taskParts'

const task = (n: number, status: ProjectTaskStatus = 'TODO', partOfTaskId: string | null = null): ProjectTask => ({
  taskId: `t${n}`, projectId: 'p1', taskKey: `autobyteus-${n}`, description: `Task ${n}`, status, dependsOnTaskIds: [], partOfTaskId,
  contextFiles: [], createdAt: '', updatedAt: '', root: null,
})

describe('taskParts (derived from the Project list, never stored)', () => {
  it('a part names its parent while it exists; a dangling or missing parent is none', () => {
    const tasks = [task(25), task(172, 'TODO', 't25'), task(3, 'TODO', 'deleted')]
    expect(parentOf(tasks[1]!, tasks)?.taskKey).toBe('autobyteus-25')
    expect(parentOf(tasks[2]!, tasks)).toBeNull()
    expect(parentOf(tasks[0]!, tasks)).toBeNull()
  })

  it('lists every part of a parent in number order, Done and Cancelled included', () => {
    const tasks = [task(25), task(172, 'DONE', 't25'), task(30, 'CANCELLED', 't25'), task(9, 'TODO', 't25'), task(40)]
    expect(partsOf(tasks[0]!, tasks).map((t) => t.taskKey)).toEqual(['autobyteus-9', 'autobyteus-30', 'autobyteus-172'])
    expect(partsOf(tasks[4]!, tasks)).toEqual([])
  })

  it('"N of M done": M leaves out Cancelled parts, which are counted apart (AC-009)', () => {
    const parts = [task(1, 'TODO'), task(2, 'IN_PROGRESS'), task(3, 'DONE'), task(4, 'DONE'), task(5, 'CANCELLED')]
    expect(partsProgressOf(parts)).toEqual({ done: 2, total: 4, cancelled: 1 })
    expect(partsProgressOf([task(5, 'CANCELLED')])).toEqual({ done: 0, total: 0, cancelled: 1 })
    expect(partsProgressOf([])).toEqual({ done: 0, total: 0, cancelled: 0 })
  })

  it('a parent may not be the Task itself or any Task that is a part (one level only, AC-012)', () => {
    const tasks = [task(1), task(2, 'TODO', 't1'), task(3), task(4, 'TODO', 'deleted')]
    expect([...partOfBlockedIds('t3', tasks)].sort()).toEqual(['t2', 't3'])
    expect([...partOfBlockedIds(undefined, tasks)]).toEqual(['t2'])
  })
})
