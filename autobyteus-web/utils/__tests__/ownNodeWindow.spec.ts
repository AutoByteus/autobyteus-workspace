import { describe, expect, it } from 'vitest'
import { isOwnNodeWindow, showsAgentRuntimeUpdates } from '../ownNodeWindow'

describe('own node window (DEC-020, AR-005)', () => {
  it('is the embedded window; runtime updates also need the node to be the desktop\'s embedded node', () => {
    expect(isOwnNodeWindow({ isEmbeddedWindow: true })).toBe(true)
    expect(isOwnNodeWindow({ isEmbeddedWindow: false })).toBe(false)
    expect(showsAgentRuntimeUpdates({ isEmbeddedWindow: true }, { desktopEmbeddedNode: true })).toBe(true)
    expect(showsAgentRuntimeUpdates({ isEmbeddedWindow: true }, { desktopEmbeddedNode: false })).toBe(false)
    expect(showsAgentRuntimeUpdates({ isEmbeddedWindow: true }, null)).toBe(false)
    expect(showsAgentRuntimeUpdates({ isEmbeddedWindow: false }, { desktopEmbeddedNode: true })).toBe(false)
  })
})
