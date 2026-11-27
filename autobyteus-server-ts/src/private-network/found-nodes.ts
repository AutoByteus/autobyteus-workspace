import { PrivateNetworkUnavailableError, privateNetworkAddressOf, type PrivateNetworkMachine, type PrivateNetworkRole, type PrivateNetworkState } from "./private-network-role.js";

/** How long one machine may take to say who it is (`/rest/remote/info` through the relay); a slower one is left out. */
export const FOUND_INFO_TIMEOUT_MS = 3_000;
/** At most this many machines are asked at the same time. */
export const FOUND_INFO_CONCURRENCY = 16;

/** A node found on the private network (contract §4): who it is, where, its machine, and whether the machine is the owner's. */
export type FoundOnPrivateNetwork = Readonly<{
  nodeId: string;
  name: string;
  /** Its private address, to pair with over the private network. */
  address: string;
  machine: Readonly<{ id: string; name: string; account: string | null; sharedBy: string | null }>;
  /** `true`: a machine on the owner's account (an unknown machine of yours); `false`: someone else's ("added by" its account). */
  mine: boolean;
}>;

/** A node found on the local network (contract §4b): "<name> at <address>". */
export type FoundOnLocalNetwork = Readonly<{ nodeId: string; name: string; address: string }>;

export type FoundNodesList = Readonly<{
  privateNetwork: Readonly<{ state: PrivateNetworkState | "notSetUp"; message: string; nodes: readonly FoundOnPrivateNetwork[] }>;
  localNetwork: readonly FoundOnLocalNetwork[];
}>;

const mapLimited = async <T, R>(items: readonly T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]!);
    }
  }));
  return results;
};

/**
 * The Nodes tab's Found lists (autobyteus-661 design DS-3, contract §4 and §4b). Private network: every online machine
 * of the network but this one is asked who it is through this node's network relay; the AutoByteus nodes visible there
 * answer. Local network: the nodes `LocalNetworkBrowser` resolved. Both leave out this node and the nodes it is paired
 * with; a node found on both is listed once, from the private network (it knows "added by"). The nodes the app
 * controls are left out by the app, which knows them. Distinct from `PeerNodeDiscovery`, which lists what a peer offers.
 */
export class FoundNodes {
  constructor(private readonly dependencies: Readonly<{
    role: Pick<PrivateNetworkRole, "status" | "machines">;
    /** Who answers at a private address through the relay (`PeerClient.fetchNodeInfo`); `null`: no visible node there. */
    info: Readonly<{ fetchNodeInfo(address: string, machine: string, timeoutMs: number): Promise<Readonly<{ nodeId: string; name: string }> | null> }>;
    peers: Readonly<{ list(): Promise<readonly Readonly<{ nodeId: string }>[]> }>;
    ownNodeId(): Promise<string>;
    localNetwork?: Readonly<{ found(): readonly FoundOnLocalNetwork[] }>;
  }>) {}

  async list(): Promise<FoundNodesList> {
    const own = await this.dependencies.ownNodeId();
    const paired = new Set((await this.dependencies.peers.list()).map((peer) => peer.nodeId));
    const privateNetwork = await this.onPrivateNetwork((nodeId) => nodeId !== own && !paired.has(nodeId));
    const onPrivate = new Set(privateNetwork.nodes.map((node) => node.nodeId));
    const seen = new Set<string>();
    const localNetwork = (this.dependencies.localNetwork?.found() ?? []).filter((node) => {
      if (node.nodeId === own || paired.has(node.nodeId) || onPrivate.has(node.nodeId) || seen.has(node.nodeId)) return false;
      seen.add(node.nodeId);
      return true;
    });
    return Object.freeze({ privateNetwork, localNetwork: Object.freeze(localNetwork) });
  }

  private async onPrivateNetwork(wanted: (nodeId: string) => boolean): Promise<FoundNodesList["privateNetwork"]> {
    let status: Awaited<ReturnType<PrivateNetworkRole["status"]>>;
    try {
      status = await this.dependencies.role.status();
    } catch (error) {
      if (error instanceof PrivateNetworkUnavailableError && error.code === "PRIVATE_NETWORK_NOT_SET_UP") {
        return Object.freeze({ state: "notSetUp", message: error.message, nodes: [] });
      }
      return Object.freeze({ state: "unreachable", message: error instanceof Error ? error.message : String(error), nodes: [] });
    }
    if (status.state !== "joined") return Object.freeze({ state: status.state, message: status.message, nodes: [] });
    const machines = (await this.dependencies.role.machines()).filter((machine) => machine.online && machine.id !== status.machine?.id);
    const answers = await mapLimited(machines, FOUND_INFO_CONCURRENCY, async (machine) => ({
      machine, answer: await this.dependencies.info.fetchNodeInfo(privateNetworkAddressOf(machine.ip), machine.id, FOUND_INFO_TIMEOUT_MS).catch(() => null),
    }));
    const ownAccount = status.machine?.account ?? null;
    const nodes = answers.flatMap(({ machine, answer }) => (answer && wanted(answer.nodeId) ? [this.found(machine, answer, ownAccount)] : []));
    return Object.freeze({ state: status.state, message: status.message, nodes: Object.freeze(nodes) });
  }

  private found(machine: PrivateNetworkMachine, answer: Readonly<{ nodeId: string; name: string }>, ownAccount: string | null): FoundOnPrivateNetwork {
    return Object.freeze({
      nodeId: answer.nodeId,
      name: answer.name,
      address: privateNetworkAddressOf(machine.ip),
      machine: Object.freeze({ id: machine.id, name: machine.name, account: machine.account, sharedBy: machine.sharedBy }),
      mine: machine.sharedBy === null && ownAccount !== null && machine.account === ownAccount,
    });
  }
}
