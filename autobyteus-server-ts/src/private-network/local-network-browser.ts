import { isIP } from "node:net";
import type { FoundOnLocalNetwork } from "./found-nodes.js";
import { ANNOUNCED_NODE_ID, createBonjourMdns, LOCAL_NETWORK_SERVICE_TYPE, type Mdns, type MdnsBrowser, type MdnsFactory, type MdnsService } from "./local-network-mdns.js";

/** The first look waits this long for the nodes on the network to answer. */
export const LOCAL_BROWSE_FIRST_WAIT_MS = 1_500;
/** A later look asks again and waits this long for new answers (the ones known stay listed). */
export const LOCAL_BROWSE_REFRESH_WAIT_MS = 800;
/** Browsing stops after this long without a look (the Nodes tab closed). */
export const LOCAL_BROWSE_IDLE_MS = 10 * 60 * 1000;
const NAME_MAX = 128;

const isLinkLocal = (address: string): boolean => address.startsWith("169.254.") || address.toLowerCase().startsWith("fe80:");

/** Where a found node is reached: its first local IPv4 address (a link-local one last), else a global IPv6 one. */
const addressOf = (service: MdnsService): string | null => {
  const addresses = (service.addresses ?? []).filter((address) => isIP(address) !== 0 && !isLinkLocal(address));
  const ipv4 = addresses.find((address) => isIP(address) === 4) ?? (service.addresses ?? []).find((address) => isIP(address) === 4);
  if (ipv4) return `http://${ipv4}:${service.port}`;
  const ipv6 = addresses.find((address) => isIP(address) === 6);
  return ipv6 ? `http://[${ipv6}]:${service.port}` : null;
};

/** A found service read strictly: a node ID in TXT `id`, a name, a port and an address; otherwise not an entry. */
const entryOf = (service: MdnsService): FoundOnLocalNetwork | null => {
  const id = (service.txt as { id?: unknown } | undefined)?.id;
  const name = typeof service.name === "string" ? service.name.trim() : "";
  if (typeof id !== "string" || !ANNOUNCED_NODE_ID.test(id) || !name || name.length > NAME_MAX) return null;
  if (!Number.isInteger(service.port) || service.port < 1 || service.port > 65535) return null;
  const address = addressOf(service);
  return address ? Object.freeze({ nodeId: id, name, address }) : null;
};

/**
 * "Found on your local network" (autobyteus-661 contract §4b, REQ-018; design DS-8): browses `_autobyteus._tcp` while
 * the Nodes tab looks, and lists each node announced there as "<name> at <address>" with its node ID (TXT `id`). The
 * first look starts browsing and waits for answers; a later one asks again; browsing stops when nobody looked for a
 * while. A failure of the network stack lists nothing (it never stops the node). `FoundNodes` leaves out this node
 * and its peers.
 */
export class LocalNetworkBrowser {
  private browsing: Readonly<{ mdns: Mdns; browser: MdnsBrowser }> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly dependencies: Readonly<{
    mdns?: MdnsFactory;
    wait?(ms: number): Promise<void>;
    firstWaitMs?: number;
    refreshWaitMs?: number;
    idleMs?: number;
    /** The DNS-SD type browsed; `_autobyteus._tcp` unless a test uses its own. */
    serviceType?: string;
    warn?(message: string): void;
  }> = {}) {}

  async found(): Promise<readonly FoundOnLocalNetwork[]> {
    const wait = this.dependencies.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    if (this.browsing) {
      this.browsing.browser.update();
      await wait(this.dependencies.refreshWaitMs ?? LOCAL_BROWSE_REFRESH_WAIT_MS);
    } else {
      if (!this.start()) return [];
      await wait(this.dependencies.firstWaitMs ?? LOCAL_BROWSE_FIRST_WAIT_MS);
    }
    this.keepBrowsing();
    const browsing = this.browsing as { browser: MdnsBrowser } | null;
    if (!browsing) return [];
    browsing.browser.expire();
    const seen = new Set<string>();
    return Object.freeze(browsing.browser.services.flatMap((service) => {
      const entry = entryOf(service);
      if (!entry || seen.has(entry.nodeId)) return [];
      seen.add(entry.nodeId);
      return [entry];
    }));
  }

  /** Stops browsing (the server closes). */
  close(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    const browsing = this.browsing;
    this.browsing = null;
    if (!browsing) return;
    try { browsing.browser.stop(); } catch { /* already stopped */ }
    browsing.mdns.destroy();
  }

  private start(): boolean {
    let mdns: Mdns | null = null;
    try {
      mdns = (this.dependencies.mdns ?? createBonjourMdns)((error) => {
        this.warn(`This node could not look for nodes on the local network: ${error.message}`);
        if (this.browsing?.mdns === mdns) this.close();
      });
      this.browsing = Object.freeze({ mdns, browser: mdns.find({ type: this.dependencies.serviceType ?? LOCAL_NETWORK_SERVICE_TYPE }) });
      return true;
    } catch (error) {
      mdns?.destroy();
      this.warn(`This node could not look for nodes on the local network: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private keepBrowsing(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!this.browsing) return;
    this.idleTimer = setTimeout(() => this.close(), this.dependencies.idleMs ?? LOCAL_BROWSE_IDLE_MS);
    this.idleTimer.unref?.();
  }

  private warn(message: string): void {
    (this.dependencies.warn ?? ((text: string) => console.warn(text)))(message);
  }
}
