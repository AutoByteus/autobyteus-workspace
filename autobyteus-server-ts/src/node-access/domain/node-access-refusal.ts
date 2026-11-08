/**
 * The refusals of the node's request gate after its Host and Origin rules (node access model §2, NA-13): network
 * admission, credential, route permission, and the revocations that close open sockets. A leaf of the project.
 */
export type NodeAccessRefusalCode =
  | "NODE_NETWORK_REFUSED"
  | "NODE_CREDENTIAL_REQUIRED"
  | "NODE_CREDENTIAL_INVALID"
  | "NODE_ROUTE_NOT_PERMITTED"
  /** A phone credential on a WebSocket that is not a phone WebSocket route. */
  | "PHONE_ACCESS_ROUTE_REFUSED"
  /** A revoked phone. */
  | "REMOTE_ACCESS_DEVICE_REVOKED"
  /** Phone Access is off on this node. */
  | "PHONE_ACCESS_DISABLED"
  /** An owner credential or a memory sync source credential was revoked while its socket was open. */
  | "NODE_CREDENTIAL_REVOKED"
  /** The peer was removed while its socket was open. */
  | "PEER_UNPAIRED";

export type NodeAccessRefusal = Readonly<{
  statusCode: 401 | 403;
  code: NodeAccessRefusalCode;
  message: string;
}>;

const refusal = (statusCode: 401 | 403, code: NodeAccessRefusalCode, message: string): NodeAccessRefusal =>
  Object.freeze({ statusCode, code, message });

export const NODE_ACCESS_REFUSALS = Object.freeze({
  networkRefused: refusal(403, "NODE_NETWORK_REFUSED", "This node does not accept connections from your network."),
  credentialRequired: refusal(401, "NODE_CREDENTIAL_REQUIRED", "This node needs a credential. Connect it on the Nodes page."),
  credentialInvalid: refusal(401, "NODE_CREDENTIAL_INVALID", "This node does not accept this credential."),
  routeNotPermitted: refusal(403, "NODE_ROUTE_NOT_PERMITTED", "This credential does not open this endpoint."),
  phoneRouteRefused: refusal(403, "PHONE_ACCESS_ROUTE_REFUSED", "Phone credentials do not open this route."),
  deviceRevoked: refusal(403, "REMOTE_ACCESS_DEVICE_REVOKED", "This paired device has been revoked."),
  phoneAccessDisabled: refusal(403, "PHONE_ACCESS_DISABLED", "Phone Access is disabled on this desktop."),
  credentialRevoked: refusal(403, "NODE_CREDENTIAL_REVOKED", "This credential was revoked."),
  peerUnpaired: refusal(403, "PEER_UNPAIRED", "This peer was removed."),
});

/** How a refusal closes a WebSocket (NA-13): 4401 for a missing or invalid credential, 4403 for the others. */
export const webSocketCloseCodeFor = (refused: NodeAccessRefusal): 4401 | 4403 => (refused.statusCode === 401 ? 4401 : 4403);
