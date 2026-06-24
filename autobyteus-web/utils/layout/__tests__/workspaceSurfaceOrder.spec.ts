import { describe, expect, it } from 'vitest'
import {
  getWorkspacePrimarySurfaceOrder,
  getWorkspaceToolOrder,
} from '../workspaceSurfaceOrder'

describe('workspaceSurfaceOrder', () => {
  it('keeps the canonical primary narrow workspace order', () => {
    expect(getWorkspacePrimarySurfaceOrder().map((surface) => surface.name)).toEqual([
      'work',
      'runs',
      'files',
      'tools',
    ])
  })

  it('keeps the canonical right tool order across presentations', () => {
    expect(getWorkspaceToolOrder()).toEqual([
      'files',
      'teamMembers',
      'terminal',
      'progress',
      'artifacts',
      'browser',
      'vnc',
    ])
  })

  it('filters contextual tools without reordering the remaining tools', () => {
    expect(getWorkspaceToolOrder({
      includeFiles: false,
      includeTeam: false,
      includeBrowser: false,
    })).toEqual([
      'terminal',
      'progress',
      'artifacts',
      'vnc',
    ])
  })
})
