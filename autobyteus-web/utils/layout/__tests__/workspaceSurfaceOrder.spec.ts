import { describe, expect, it } from 'vitest'
import { getWorkspaceToolOrder } from '../workspaceSurfaceOrder'

describe('workspaceSurfaceOrder', () => {
  it('keeps the canonical right tool order across presentations', () => {
    expect(getWorkspaceToolOrder()).toEqual([
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
