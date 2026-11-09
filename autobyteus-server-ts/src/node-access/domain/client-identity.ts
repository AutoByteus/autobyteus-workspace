/**
 * What the node's request gate established for a request (node access model, "client identity"). A leaf of the
 * project: it imports nothing, so every area that verifies a credential kind can name the identity it returns.
 */
export type ClientIdentity =
  /** A desktop: the launch credential of the desktop that started this node, or an owner credential it issued. */
  | Readonly<{ kind: "owner"; credentialId: string }>
  /** A paired phone. */
  | Readonly<{ kind: "phone"; deviceId: string }>
  /** A paired peer node, proven by its request signature. */
  | Readonly<{ kind: "peer"; nodeId: string }>
  /** A memory sync source, by its `mhub_` credential. */
  | Readonly<{ kind: "memory_sync_source"; credentialId: string }>;

export type ClientKind = ClientIdentity["kind"];

/** The one ID a client of each kind is known by. */
export const clientIdentityId = (identity: ClientIdentity): string => {
  switch (identity.kind) {
    case "owner": return identity.credentialId;
    case "phone": return identity.deviceId;
    case "peer": return identity.nodeId;
    case "memory_sync_source": return identity.credentialId;
  }
};
