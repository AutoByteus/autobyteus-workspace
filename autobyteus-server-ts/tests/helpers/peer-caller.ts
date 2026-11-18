import type { ClientIdentity } from "../../src/node-access/domain/client-identity.js";
import { PEER_FROM_HEADER } from "../../src/node-access/domain/credential-verification.js";

/**
 * For in-process node pairs whose fake network hands a request straight to the peer gateway: the identity the node
 * access gate would establish from the request's signature headers (node access model NA-9). The gate's own
 * signature check is covered by its tests; these suites cover what happens behind it.
 */
export const peerCallerOf = (headers: HeadersInit | Readonly<Record<string, string>> | undefined): ClientIdentity | null => {
  const from = new Headers(headers as HeadersInit | undefined).get(PEER_FROM_HEADER);
  return from ? { kind: "peer", nodeId: from } : null;
};
