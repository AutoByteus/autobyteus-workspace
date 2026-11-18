import { normalizeClientAddress } from "../domain/client-address.js";
import { createIpNetworkSet, parseIpNetwork, TAILSCALE_NETWORKS, type IpNetwork, type IpNetworkSet } from "../domain/ip-network.js";
import type {
  ConnectionAddresses,
  NetworkAdmissionCheck,
  NetworkAdmissionFacts,
  NetworkAdmissionFactsSource,
} from "../domain/network-admission-facts.js";

const REFRESH_INTERVAL_MS = 30_000;
const REFUSAL_REFRESH_MIN_INTERVAL_MS = 5_000;

type AdmissionSnapshot = Readonly<{
  runsInContainer: boolean;
  tailscaleAddresses: ReadonlySet<string>;
  allowedLocalNetwork: IpNetworkSet;
}>;

const tailscaleNetworks = createIpNetworkSet(TAILSCALE_NETWORKS);

const EMPTY_SNAPSHOT: AdmissionSnapshot = Object.freeze({
  runsInContainer: false,
  tailscaleAddresses: new Set<string>(),
  allowedLocalNetwork: createIpNetworkSet([]),
});

const normalizedAddressSet = (addresses: readonly string[]): ReadonlySet<string> =>
  new Set(addresses.map((address) => normalizeClientAddress(address)?.normalized).filter((value): value is string => Boolean(value)));

const toSnapshot = (facts: NetworkAdmissionFacts): AdmissionSnapshot => ({
  runsInContainer: facts.runsInContainer,
  tailscaleAddresses: normalizedAddressSet(facts.tailscaleAddresses),
  allowedLocalNetwork: createIpNetworkSet(facts.localNetwork?.allowed
    ? facts.localNetwork.subnets.map(parseIpNetwork).filter((network): network is IpNetwork => network !== null)
    : []),
});

/**
 * Network admission (NA-3, NA-4; design M-6, DS-007): whether a connection arrived from a network this node accepts,
 * by its client address. A request is matched against an in-memory snapshot only; the snapshot is read every 30 s,
 * when the owner allows or disallows a local network, and when a refused address arrives (at most every 5 s, so a
 * Wi-Fi switch is noticed at once).
 */
export class NetworkAdmission implements NetworkAdmissionCheck {
  private snapshot: AdmissionSnapshot | null = null;
  private refreshing: Promise<AdmissionSnapshot> | null = null;
  private lastRefreshAt = 0;
  private timer: NodeJS.Timeout | null = null;
  private readonly unsubscribe: () => void;
  private readonly configuredNetworks: IpNetworkSet;

  constructor(
    private readonly factsSource: NetworkAdmissionFactsSource,
    /** `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`. */
    configuredNetworks: readonly IpNetwork[],
    private readonly now: () => number = Date.now,
  ) {
    this.configuredNetworks = createIpNetworkSet(configuredNetworks);
    this.unsubscribe = factsSource.onAdmissionFactsChanged(() => { void this.refresh().catch(() => undefined); });
  }

  /** Starts the periodic refresh; `stop` ends it. */
  start(): void {
    this.timer ??= setInterval(() => { void this.refresh().catch(() => undefined); }, REFRESH_INTERVAL_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unsubscribe();
  }

  async admits(connection: ConnectionAddresses): Promise<boolean> {
    const snapshot = this.snapshot ?? await this.refresh();
    if (this.matches(snapshot, connection)) return true;
    if (this.now() - this.lastRefreshAt < REFUSAL_REFRESH_MIN_INTERVAL_MS) return false;
    return this.matches(await this.refresh(), connection);
  }

  private matches(snapshot: AdmissionSnapshot, connection: ConnectionAddresses): boolean {
    const client = normalizeClientAddress(connection.clientAddress);
    if (!client) return false;
    if (client.family === "ipv4" ? client.normalized.startsWith("127.") : client.normalized === "::1") return true;
    if (tailscaleNetworks.contains(client.normalized, client.family)) {
      const local = normalizeClientAddress(connection.localAddress)?.normalized;
      if (local && snapshot.tailscaleAddresses.has(local)) return true;
    }
    if (snapshot.allowedLocalNetwork.contains(client.normalized, client.family)) return true;
    if (this.configuredNetworks.contains(client.normalized, client.family)) return true;
    return snapshot.runsInContainer;
  }

  private refresh(): Promise<AdmissionSnapshot> {
    this.refreshing ??= this.factsSource.readAdmissionFacts()
      .then((facts) => {
        this.snapshot = toSnapshot(facts);
        return this.snapshot;
      }, (error: unknown) => {
        // Fail closed: the previous snapshot, or only this computer and the configured networks.
        console.warn(`Node access: network facts could not be read: ${String(error)}`);
        this.snapshot ??= EMPTY_SNAPSHOT;
        return this.snapshot;
      })
      .finally(() => {
        this.lastRefreshAt = this.now();
        this.refreshing = null;
      });
    return this.refreshing;
  }
}
