import { EventEmitter } from 'events'
import { describe, expect, it, vi } from 'vitest'
import { attachBrowserTabObservers } from '../browser-tab-observers'
import type { BrowserTabRecord } from '../browser-tab-types'

describe('native tab observation', () => {
  it('preserves top URL on child events, notifies same-URL changes and retains custom titles and destruction', () => {
    const contents = Object.assign(new EventEmitter(), { getTitle: () => 'Page', getURL: () => 'http://localhost/settled' })
    const session = { url: 'http://localhost/top', title: 'Custom', customTitle: 'Custom', view: { webContents: contents } } as unknown as BrowserTabRecord
    const updated = vi.fn(), destroyed = vi.fn()
    attachBrowserTabObservers(session, updated, destroyed)
    contents.emit('did-navigate-in-page', {}, 'http://localhost/child', false)
    expect(session.url).toBe('http://localhost/top')
    contents.emit('did-navigate-in-page', {}, session.url, true)
    expect(updated).toHaveBeenCalledTimes(2)
    contents.emit('page-title-updated', {}, 'Other')
    expect(session.title).toBe('Custom')
    contents.emit('did-navigate', {}, 'http://localhost/new')
    expect(session.title).toBe('Custom')
    expect(session.url).toBe('http://localhost/new')
    contents.emit('did-stop-loading')
    expect(session.url).toBe('http://localhost/settled')
    session.customTitle = null
    contents.emit('page-title-updated', {}, ' Other ')
    expect(session.title).toBe('Other')
    contents.emit('did-navigate', {}, 'http://localhost/final')
    expect(session.title).toBe('Page')
    contents.emit('destroyed')
    expect(destroyed).toHaveBeenCalledOnce()
    expect(contents.listenerCount('did-navigate-in-page')).toBe(1)
  })
})
