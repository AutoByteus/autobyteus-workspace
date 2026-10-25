import { describe, expect, it, vi } from 'vitest'
import {
  deliverUpdateNotificationChange,
  parseUpdateNotificationChangeMessage,
  UpdateNotificationChangeFeed,
} from '../updateNotificationChangeFeed'

const stores = vi.hoisted(() => ({ reload: vi.fn(), refresh: vi.fn() }))
vi.mock('~/stores/updateNotificationsStore', () => ({ useUpdateNotificationsStore: () => ({ reload: stores.reload }) }))
vi.mock('~/stores/updateAutomationStore', () => ({ useUpdateAutomationStore: () => ({ refresh: stores.refresh }) }))
import type { NodeChangeSocket } from '~/services/nodeChangeFeed/nodeChangeFeed'

describe('update notification change feed (DS-005)', () => {
  it('accepts exactly the three server frames', () => {
    expect(parseUpdateNotificationChangeMessage('{"type":"connected"}')).toEqual({ type: 'connected' })
    expect(parseUpdateNotificationChangeMessage('{"type":"update_notifications_changed"}')).toEqual({ type: 'update_notifications_changed' })
    expect(parseUpdateNotificationChangeMessage('{"type":"update_settings_changed"}')).toEqual({ type: 'update_settings_changed' })
    expect(parseUpdateNotificationChangeMessage('{"type":"update_notifications_changed","extra":1}')).toBeNull()
    expect(parseUpdateNotificationChangeMessage('{"type":"other"}')).toBeNull()
    expect(parseUpdateNotificationChangeMessage('not json')).toBeNull()
  })

  it('delivers every frame to the consumer, which re-reads the notifications', () => {
    let socket: NodeChangeSocket | null = null
    const deliver = vi.fn()
    const feed = new UpdateNotificationChangeFeed({
      endpoint: () => 'ws://127.0.0.1:1/ws/update-notifications',
      deliver,
      createSocket: () => (socket = { close: vi.fn(), onmessage: null, onclose: null, onerror: null }),
    })
    const release = feed.retain()
    socket!.onmessage!({ data: '{"type":"connected"}' })
    socket!.onmessage!({ data: '{"type":"update_notifications_changed"}' })
    expect(deliver.mock.calls.map(([message]) => message.type)).toEqual(['connected', 'update_notifications_changed'])
    release()
  })

  it('re-reads the notifications or the settings per frame, and both on connect (DS-004)', () => {
    deliverUpdateNotificationChange({ type: 'update_notifications_changed' })
    expect([stores.reload.mock.calls.length, stores.refresh.mock.calls.length]).toEqual([1, 0])
    deliverUpdateNotificationChange({ type: 'update_settings_changed' })
    expect([stores.reload.mock.calls.length, stores.refresh.mock.calls.length]).toEqual([1, 1])
    deliverUpdateNotificationChange({ type: 'connected' })
    expect([stores.reload.mock.calls.length, stores.refresh.mock.calls.length]).toEqual([2, 2])
  })
})
