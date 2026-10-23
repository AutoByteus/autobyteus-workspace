import { describe, expect, it } from 'vitest'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { addressHintOf, causeText, failureText } from '../nodeConnectionErrorText'

/** one-nodes-tab REQ-707, REQ-708: causes in plain words (the spec's English copy); "fetch failed" is never shown. */

const t = (key: string, params?: Record<string, string | number>) => localizationRuntime.translate(key, params)

describe('nodeConnectionErrorText', () => {
  it('words each cause', () => {
    expect(causeText(t, 'refused', 'localhost:8005')).toBe('Nothing answers at that address and port.')
    expect(causeText(t, 'timeout', 'x')).toBe('No answer within 20 seconds.')
    expect(causeText(t, 'not_found', 'nas.local:29695')).toBe("nas.local can't be found from here.")
    expect(causeText(t, 'not_found', 'host.docker.internal:29695', 'docker')).toBe("host.docker.internal can't be found from docker.")
    expect(causeText(t, 'not_autobyteus', 'x')).toBe("Something answers there, but it isn't an AutoByteus node.")
    expect(causeText(t, 'unreachable', 'x')).not.toMatch(/fetch failed/)
  })

  it('words a refused change by its code, an address lookup by its first attempt', () => {
    expect(failureText(t, { code: 'PEER_UNREACHABLE', message: 'fetch failed', reason: 'refused', address: 'http://localhost:8005' }, { node: '8005' }))
      .toBe('Nothing answers at that address and port.')
    expect(failureText(t, { code: 'PEER_UNREACHABLE', message: 'x', attempts: [{ address: 'http://192.168.2.90:29695', result: 'different_node' }] }, { node: 'spare' }))
      .toBe('A different node answers there than the one registered.')
    expect(failureText(t, { code: 'REMOTE_COLLABORATION_OFF', message: 'x' }, { node: 'studio' })).toBe('Remote collaboration is off on studio.')
    expect(failureText(t, { code: 'PEER_NAME_TAKEN', message: 'x' }, { node: '8003', name: 'Embedded Node' })).toBe('8003 already has a node named Embedded Node.')
    expect(failureText(t, { code: 'PEER_IDENTITY_MISMATCH', message: 'x' }, { node: 'spare' })).toBe('A different node answers there than the one registered.')
  })

  it('the Docker hint only for a node in a container whose first address was loopback, with host.docker.internal on that port', () => {
    expect(addressHintOf({ code: 'PEER_UNREACHABLE', message: 'x', address: 'http://127.0.0.1:29695', loopbackInContainer: true }))
      .toEqual({ firstTried: 'http://127.0.0.1:29695', suggestion: 'http://host.docker.internal:29695' })
    expect(addressHintOf({ code: 'PEER_UNREACHABLE', message: 'x', address: 'http://127.0.0.1:29695', loopbackInContainer: false })).toBeNull()
    expect(addressHintOf(undefined)).toBeNull()
  })
})
