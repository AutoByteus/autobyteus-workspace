/**
 * The 4403 refusal codes that end a credential for good: it cannot work again without pairing or connecting again.
 * Phone Access off (`PHONE_ACCESS_DISABLED`) and a network refusal (`NODE_NETWORK_REFUSED`) also close with 4403, but
 * they can change back, so a stream closed for them keeps reconnecting and resumes by itself (autobyteus-435 DEC-008).
 */
const CREDENTIAL_ENDING_REFUSAL_CODES: ReadonlySet<string> = new Set([
  'REMOTE_ACCESS_DEVICE_REVOKED',
  'NODE_CREDENTIAL_REVOKED',
  'NODE_CREDENTIAL_INVALID',
  'PEER_UNPAIRED',
])

/**
 * Whether the node closed a live stream because it refuses this client's credential (node access model NA-11, NA-13):
 * 4401 (a missing or invalid credential), or 4403 with a credential-ending refusal code as the close reason. Connecting
 * again would only be refused again, so no stream owner reconnects after such a close; each owner keeps its own other
 * final codes.
 */
export const isCredentialRefusalClose = (code: number, reason: string | undefined): boolean =>
  code === 4401 || (code === 4403 && CREDENTIAL_ENDING_REFUSAL_CODES.has(reason ?? ''))
