import { describe, expect, it, vi } from 'vitest'
import { parseUpdateNotificationChangeMessage, UpdateNotificationChangeFeed } from '../updateNotificationChangeFeed'
import type { NodeChangeSocket } from '~/services/nodeChangeFeed/nodeChangeFeed'

describe('update notification change feed (DS-005)', () => {
  it('accepts exactly the two server frames', () => {
    expect(parseUpdateNotificationChangeMessage('{"type":"connected"}')).toEqual({ type: 'connected' })
    expect(parseUpdateNotificationChangeMessage('{"type":"update_notifications_changed"}')).toEqual({ type: 'update_notifications_changed' })
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
})
