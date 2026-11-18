import { describe, expect, it } from 'vitest'
import { isCredentialRefusalClose } from '../credentialRefusalClose'

// autobyteus-435 REQ-010 (a), DEC-008: only a refused credential is final; Phone Access and the network can change back.
describe('isCredentialRefusalClose', () => {
  it.each([
    [4401, 'NODE_CREDENTIAL_REQUIRED'],
    [4401, 'NODE_CREDENTIAL_INVALID'],
    [4401, undefined],
    [4403, 'REMOTE_ACCESS_DEVICE_REVOKED'],
    [4403, 'NODE_CREDENTIAL_REVOKED'],
    [4403, 'NODE_CREDENTIAL_INVALID'],
    [4403, 'PEER_UNPAIRED'],
  ])('a close %i %s is a credential refusal', (code, reason) => {
    expect(isCredentialRefusalClose(code, reason)).toBe(true)
  })

  it.each([
    [4403, 'PHONE_ACCESS_DISABLED'],
    [4403, 'NODE_NETWORK_REFUSED'],
    [4403, 'NODE_ROUTE_NOT_PERMITTED'],
    [4403, ''],
    [4403, undefined],
    [1006, ''],
    [1001, 'going away'],
    [4004, 'REMOTE_ACCESS_DEVICE_REVOKED'],
  ])('a close %i %s is not', (code, reason) => {
    expect(isCredentialRefusalClose(code, reason)).toBe(false)
  })
})
