import { describe, expect, it } from 'vitest'
import { getWorkspaceToolOrder } from '../workspaceSurfaceOrder'

describe('workspaceSurfaceOrder', () => {
  it('keeps the canonical right tool order across presentations, Projects first (before Files)', () => {
    expect(getWorkspaceToolOrder()).toEqual([
      'projects',
      'files',
      'teamMembers',
      'terminal',
      'progress',
      'usage',
      'artifacts',
      'browser',
      'vnc',
    ])
  })

  it('filters contextual tools without reordering the remaining tools', () => {
    expect(getWorkspaceToolOrder({
      includeProjects: false,
      includeFiles: false,
      includeTeam: false,
      includeBrowser: false,
    })).toEqual([
      'terminal',
      'progress',
      'usage',
      'artifacts',
      'vnc',
    ])
  })
})
