import { describe, expect, it } from 'vitest'
import en from '~/localization/messages/en/projects'
import zhCN from '~/localization/messages/zh-CN/projects'
import type { ProjectTaskStatus } from '~/types/project'
import {
  BOARD_OPEN_LANES, TASK_STATUS_LABEL_KEYS, TEMP_LANES_OPEN, TEMP_LANE_LABEL_KEYS,
  isOpenTaskStatus, taskStatusPillClass, tempLanePillClass, tempTaskLaneOf,
} from '../taskStatusPresentation'

const STATUSES: ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']

describe('taskStatusPresentation', () => {
  it('labels CANCELLED "Cancelled" / "已取消", apart from Done, in both locales (REQ-001)', () => {
    const catalogs = [en, zhCN] as Record<string, string>[]
    expect(catalogs.map((catalog) => catalog[TASK_STATUS_LABEL_KEYS.CANCELLED])).toEqual(['Cancelled', '已取消'])
    expect(catalogs.map((catalog) => catalog[TEMP_LANE_LABEL_KEYS.cancelled])).toEqual(['Cancelled', '已取消'])
    for (const catalog of catalogs) {
      for (const status of STATUSES) expect(catalog[TASK_STATUS_LABEL_KEYS[status]]).toBeTruthy()
      expect(catalog[TASK_STATUS_LABEL_KEYS.CANCELLED]).not.toBe(catalog[TASK_STATUS_LABEL_KEYS.DONE])
    }
  })

  it('gives every status its own pill style; Cancelled is muted, not Done green (REQ-009)', () => {
    expect(new Set(STATUSES.map(taskStatusPillClass)).size).toBe(4)
    expect(taskStatusPillClass('CANCELLED')).toContain('text-slate-500')
    expect(taskStatusPillClass('CANCELLED')).not.toContain('emerald')
    expect(tempLanePillClass('cancelled')).toBe(taskStatusPillClass('CANCELLED'))
  })

  it('counts only TODO and IN_PROGRESS as open (REQ-011)', () => {
    expect(STATUSES.filter(isOpenTaskStatus)).toEqual(['TODO', 'IN_PROGRESS'])
  })

  it('keeps Cancelled out of the always-shown lanes; Temp tasks are Open, Done or Cancelled (REQ-008, REQ-010)', () => {
    expect(BOARD_OPEN_LANES).toEqual(['TODO', 'IN_PROGRESS', 'DONE'])
    expect(TEMP_LANES_OPEN).toEqual(['open', 'done'])
    expect(STATUSES.map(tempTaskLaneOf)).toEqual(['open', 'open', 'done', 'cancelled'])
  })
})
