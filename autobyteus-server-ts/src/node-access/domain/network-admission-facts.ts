/**
 * This computer's network facts that network admission needs (NA-3, design M-6). `NodeNetworkService`
 * (`remote-access`) reads them from the computer; `NetworkAdmission` keeps a snapshot.
 */
export type NetworkAdmissionFacts = Readonly<{
  /** In a container the client address cannot tell this computer from the local network: every arrival is admitted. */
  runsInContainer: boolean;
  /** This computer's Tailscale addresses (IPv4 and IPv6). */
  tailscaleAddresses: readonly string[];
  /** The local network this computer is on: its subnets (`address/prefix`) and whether the owner allowed it. */
  localNetwork: Readonly<{ subnets: readonly string[]; allowed: boolean }> | null;
}>;

export type NetworkAdmissionFactsSource = Readonly<{
  readAdmissionFacts(): Promise<NetworkAdmissionFacts>;
  /** Called when the owner allows or disallows a local network, so the snapshot is read again at once. */
  onAdmissionFactsChanged(listener: () => void): () => void;
}>;

/** The two addresses of one connection, as Node reports them (`socket.remoteAddress`, `socket.localAddress`). */
export type ConnectionAddresses = Readonly<{ clientAddress: string | undefined; localAddress: string | undefined }>;

/** Whether a connection arrived from a network this node accepts (NA-3); `NetworkAdmission` implements it. */
export type NetworkAdmissionCheck = Readonly<{ admits(connection: ConnectionAddresses): Promise<boolean> }>;
