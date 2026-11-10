import { describe, expect, it } from 'vitest'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { addressHintOf, causeText, failureText } from '../nodeConnectionErrorText'
import { settingsFailureOf } from '../nodeSettingsError'

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
    // autobyteus-290 N-910: a node whose identity waits for its data migration.
    expect(causeText(t, 'identity_pending', 'x')).toBe("This node's identity is waiting for its data migration.")
  })

  // autobyteus-435 REQ-003, AC-003-2, DEC-019: a browser window cannot read why something refuses it, so it names both
  // settings; the desktop window reads the Host gate's code and gets the exact host_refused words (above).
  it('window_refused: this page\'s address (AUTOBYTEUS_ALLOWED_ORIGINS) or the name (AUTOBYTEUS_ALLOWED_HOSTS)', () => {
    expect(causeText(t, 'window_refused', 'office-mac.local:29695')).toBe('Something answers at office-mac.local, but it doesn’t accept requests from this page. '
      + 'If it is an AutoByteus node, allow this page’s address (AUTOBYTEUS_ALLOWED_ORIGINS) or the name office-mac.local (AUTOBYTEUS_ALLOWED_HOSTS) on it.')
    expect(causeText(t, 'host_refused', 'office-mac.local:29695')).toBe('The node at this address doesn’t accept the name office-mac.local. '
      + 'Add office-mac.local to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address.')
  })

  it('words a refused change by its code, an address lookup by its first attempt', () => {
    expect(failureText(t, { code: 'PEER_UNREACHABLE', message: 'fetch failed', reason: 'refused', address: 'http://localhost:8005' }, { node: '8005' }))
      .toBe('Nothing answers at that address and port.')
    expect(failureText(t, { code: 'PEER_UNREACHABLE', message: 'x', attempts: [{ address: 'http://192.168.2.90:29695', result: 'different_node' }] }, { node: 'spare' }))
      .toBe('A different node answers there than the one registered.')
    expect(failureText(t, { code: 'REMOTE_COLLABORATION_OFF', message: 'x' }, { node: 'studio' })).toBe('Remote collaboration is off on studio.')
    expect(failureText(t, { code: 'PEER_NAME_TAKEN', message: 'x' }, { node: '8003', name: 'Embedded Node' })).toBe('8003 already has a node named Embedded Node.')
    expect(failureText(t, { code: 'PEER_IDENTITY_MISMATCH', message: 'x' }, { node: 'spare' })).toBe('A different node answers there than the one registered.')
    expect(failureText(t, { code: 'NODE_IDENTITY_NOT_MIGRATED', message: 'x' }, { node: 'spare' })).toBe("This node's identity is waiting for its data migration.")
    expect(failureText(t, { code: 'PEER_UNREACHABLE', message: 'x', attempts: [{ address: 'http://spare:29695', result: 'identity_pending' }] }, { node: 'spare' }))
      .toBe("This node's identity is waiting for its data migration.")
  })

  // autobyteus-426 REQ-020 / AC-020 (2), (3): a peer address whose node refuses the name it is addressed by.
  it('names the refused host on a changed address and on the connect flow\'s address lookup; a non-node answer keeps its text', () => {
    const text = 'The node at this address doesn’t accept the name lvh.me. Add lvh.me to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address.'
    const changeAddress = settingsFailureOf({ message: 'http://lvh.me:29695 refuses the name lvh.me',
      extensions: { code: 'PEER_HOST_REFUSED', address: 'http://lvh.me:29695', host: 'lvh.me' } })
    expect(changeAddress).toMatchObject({ code: 'PEER_HOST_REFUSED', host: 'lvh.me' })
    expect(failureText(t, changeAddress, { node: 'office' })).toBe(text)
    expect(failureText(t, { code: 'PEER_HOST_REFUSED', message: 'x', address: 'http://lvh.me:29695' }, { node: 'office' })).toBe(text)
    expect(failureText(t, { code: 'PEER_UNREACHABLE', message: 'x', attempts: [
      { address: 'http://lvh.me:29695', result: 'host_refused' },
      { address: 'http://192.168.2.90:29695', result: 'refused' },
    ] }, { node: 'office' })).toBe(text)
    expect(causeText(t, 'host_refused', 'office.example.com:29695')).toContain('doesn’t accept the name office.example.com.')
    expect(failureText(t, { code: 'PEER_NOT_AUTOBYTEUS', message: 'x' }, { node: 'office' })).toBe("Something answers there, but it isn't an AutoByteus node.")
  })

  it('the Docker hint only for a node in a container whose first address was loopback, with host.docker.internal on that port', () => {
    expect(addressHintOf({ code: 'PEER_UNREACHABLE', message: 'x', address: 'http://127.0.0.1:29695', loopbackInContainer: true }))
      .toEqual({ firstTried: 'http://127.0.0.1:29695', suggestion: 'http://host.docker.internal:29695' })
    expect(addressHintOf({ code: 'PEER_UNREACHABLE', message: 'x', address: 'http://127.0.0.1:29695', loopbackInContainer: false })).toBeNull()
    expect(addressHintOf(undefined)).toBeNull()
  })
})
