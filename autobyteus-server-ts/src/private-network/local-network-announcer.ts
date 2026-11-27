import { ANNOUNCED_NODE_ID, createBonjourMdns, LOCAL_NETWORK_SERVICE_TYPE, type Mdns, type MdnsAnnouncement, type MdnsFactory } from "./local-network-mdns.js";
import type { NodeVisibilityState } from "./node-visibility.js";

/** A DNS label holds at most 63 bytes; a longer name is shortened. */
const INSTANCE_NAME_MAX = 63;
/** How long a withdrawal may take before the stack is closed anyway. */
const WITHDRAW_TIMEOUT_MS = 2_000;

type Wanted = Readonly<{ name: string; port: number; nodeId: string }>;
type Announced = Readonly<{ key: string; mdns: Mdns; announcement: MdnsAnnouncement }>;

const instanceName = (name: string): string => {
  const trimmed = name.trim() || "AutoByteus node";
  let shortened = trimmed;
  while (Buffer.byteLength(shortened, "utf8") > INSTANCE_NAME_MAX) shortened = shortened.slice(0, -1);
  return shortened.trimEnd();
};

/**
 * "Visible on my local network" (autobyteus-661 contract §4b, REQ-018; design DS-8): while the switch is on, this node
 * accepts connections from its local network and listens, it announces itself by DNS-SD over multicast DNS as
 * `_autobyteus._tcp` with its name, port and TXT `id` = its node ID; otherwise nothing is announced. Turning the switch
 * off, or the server closing, withdraws the announcement (goodbye packets). A failure of the network stack is logged
 * and leaves the node unannounced; it never stops the node.
 */
export class LocalNetworkAnnouncer {
  private announced: Announced | null = null;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly dependencies: Readonly<{
    visibility: Readonly<{ state(): NodeVisibilityState }>;
    /** Whether this node accepts connections from the local network it is on now. */
    localNetworkAllowed(): Promise<boolean>;
    ownNodeId(): Promise<string>;
    ownName(): Promise<string>;
    /** The port this node listens on; `null` while it does not listen yet. */
    port(): number | null;
    mdns?: MdnsFactory;
    /** The DNS-SD type announced; `_autobyteus._tcp` unless a test uses its own. */
    serviceType?: string;
    warn?(message: string): void;
  }>) {}

  /** Brings the announcement in line with the switch, this node's name and its port. */
  sync(): Promise<void> {
    return this.serialized(async () => {
      const wanted = await this.wanted().catch((error: unknown) => {
        this.warn(`The local network announcement was not updated: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
      const key = wanted ? JSON.stringify(wanted) : null;
      if (key === (this.announced?.key ?? null)) return;
      await this.withdraw();
      if (wanted) this.announce(wanted, key!);
    });
  }

  /** Withdraws the announcement (the server closes). */
  close(): Promise<void> {
    return this.serialized(() => this.withdraw());
  }

  /** Whether this node is announced now. */
  isAnnounced(): boolean {
    return this.announced !== null;
  }

  private async wanted(): Promise<Wanted | null> {
    const port = this.dependencies.port();
    if (!this.dependencies.visibility.state().localNetwork || port === null || !await this.dependencies.localNetworkAllowed()) return null;
    const nodeId = await this.dependencies.ownNodeId();
    if (!ANNOUNCED_NODE_ID.test(nodeId)) return null;
    return Object.freeze({ name: instanceName(await this.dependencies.ownName()), port, nodeId });
  }

  private announce(wanted: Wanted, key: string): void {
    let mdns: Mdns | null = null;
    const failed = (error: Error) => {
      this.warn(`This node could not announce itself on the local network: ${error.message}`);
      void this.serialized(async () => { if (this.announced?.mdns === mdns) await this.withdraw(); });
    };
    try {
      mdns = (this.dependencies.mdns ?? createBonjourMdns)(failed);
      const announcement = mdns.publish({ name: wanted.name, type: this.dependencies.serviceType ?? LOCAL_NETWORK_SERVICE_TYPE, port: wanted.port, txt: { id: wanted.nodeId } });
      this.announced = Object.freeze({ key, mdns, announcement });
    } catch (error) {
      mdns?.destroy();
      this.warn(`This node could not announce itself on the local network: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async withdraw(): Promise<void> {
    const announced = this.announced;
    this.announced = null;
    if (!announced) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, WITHDRAW_TIMEOUT_MS);
      const done = () => { clearTimeout(timer); resolve(); };
      try {
        announced.announcement.stop(() => announced.mdns.destroy(done));
      } catch {
        announced.mdns.destroy(done);
      }
    });
  }

  private warn(message: string): void {
    (this.dependencies.warn ?? ((text: string) => console.warn(text)))(message);
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
