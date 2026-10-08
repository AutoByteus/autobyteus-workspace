import { describe, expect, it } from 'vitest'
import en from '~/localization/messages/en/projects'
import zhCN from '~/localization/messages/zh-CN/projects'
import type { ProjectTaskStatus } from '~/types/project'
import {
  BOARD_OPEN_LANES, TASK_STATUS_LABEL_KEYS, TEMP_LANES_OPEN, TEMP_LANE_LABEL_KEYS,
  isOpenTaskStatus, taskStatusPillClass, tempLanePillClass, tempTaskLaneOf,
} from '../taskStatusPresentation'

const STATUSES: ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CLOSED']

describe('taskStatusPresentation', () => {
  it('labels CLOSED "Closed" / "已关闭", apart from Done, in both locales (REQ-001)', () => {
    const catalogs = [en, zhCN] as Record<string, string>[]
    expect(catalogs.map((catalog) => catalog[TASK_STATUS_LABEL_KEYS.CLOSED])).toEqual(['Closed', '已关闭'])
    expect(catalogs.map((catalog) => catalog[TEMP_LANE_LABEL_KEYS.closed])).toEqual(['Closed', '已关闭'])
    for (const catalog of catalogs) {
      for (const status of STATUSES) expect(catalog[TASK_STATUS_LABEL_KEYS[status]]).toBeTruthy()
      expect(catalog[TASK_STATUS_LABEL_KEYS.CLOSED]).not.toBe(catalog[TASK_STATUS_LABEL_KEYS.DONE])
    }
  })

  it('gives every status its own pill style; Closed is muted, not Done green (REQ-009)', () => {
    expect(new Set(STATUSES.map(taskStatusPillClass)).size).toBe(4)
    expect(taskStatusPillClass('CLOSED')).toContain('text-slate-500')
    expect(taskStatusPillClass('CLOSED')).not.toContain('emerald')
    expect(tempLanePillClass('closed')).toBe(taskStatusPillClass('CLOSED'))
  })

  it('counts only TODO and IN_PROGRESS as open (REQ-011)', () => {
    expect(STATUSES.filter(isOpenTaskStatus)).toEqual(['TODO', 'IN_PROGRESS'])
  })

  it('keeps Closed out of the always-shown lanes; Temp tasks are Open, Done or Closed (REQ-008, REQ-010)', () => {
    expect(BOARD_OPEN_LANES).toEqual(['TODO', 'IN_PROGRESS', 'DONE'])
    expect(TEMP_LANES_OPEN).toEqual(['open', 'done'])
    expect(STATUSES.map(tempTaskLaneOf)).toEqual(['open', 'open', 'done', 'closed'])
  })
})
