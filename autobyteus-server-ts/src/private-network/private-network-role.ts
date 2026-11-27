import type { ExtensionManager } from "../extensions/services/extension-manager.js";

/** The network program's states (design § Data Contract, role action `status`). */
export type PrivateNetworkState = "notJoined" | "waitingApproval" | "joined" | "expired" | "signedOut" | "unreachable";
const STATES: readonly PrivateNetworkState[] = ["notJoined", "waitingApproval", "joined", "expired", "signedOut", "unreachable"];

/** One machine of the private network: its name, private address, stable machine ID and the account that added it. */
export type PrivateNetworkMachine = Readonly<{ name: string; ip: string; id: string; account: string | null; sharedBy: string | null; online: boolean }>;
export type PrivateNetworkStatus = Readonly<{
  state: PrivateNetworkState;
  machine: Readonly<{ name: string; ip: string; id: string; account: string | null }> | null;
  message: string;
}>;
/** The network program's local relay: an HTTP CONNECT proxy on 127.0.0.1 with a credential new at every start. */
export type PrivateNetworkRelay = Readonly<{ port: number; credential: string }>;

/**
 * The port the network program listens on at its machine's private address and hands over to its node (design DS-2;
 * contract §1 address `100.88.80.80:8000`). Every node is its own machine on the private network, so the port is the
 * same for all.
 */
export const PRIVATE_NETWORK_NODE_PORT = 8000;
/** Where a node is reached on the private network: its machine's private address and the program's port. */
export const privateNetworkAddressOf = (ip: string): string =>
  `http://${ip.includes(":") ? `[${ip}]` : ip}:${PRIVATE_NETWORK_NODE_PORT}`;

/** Why the role could not answer: no extension provides it here, or its answer was not what the role promises. */
export class PrivateNetworkUnavailableError extends Error {
  constructor(readonly code: "PRIVATE_NETWORK_NOT_SET_UP" | "PRIVATE_NETWORK_BAD_ANSWER", message: string) {
    super(message);
    this.name = "PrivateNetworkUnavailableError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 512): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const optionalText = (value: unknown): string | null => (text(value) ? value : null);

const machineOf = (value: unknown): PrivateNetworkMachine | null => {
  if (!isRecord(value) || !text(value.name) || !text(value.ip, 64) || !text(value.id) || typeof value.online !== "boolean") return null;
  return Object.freeze({ name: value.name, ip: value.ip, id: value.id, account: optionalText(value.account), sharedBy: optionalText(value.sharedBy), online: value.online });
};

/**
 * The `private-network` role of this node (autobyteus-661, design `PrivateNetworkRole`): the extension that is on and
 * provides it, resolved at every call through the Extension Manager (the core never imports the extension), and its
 * role actions read strictly. Without such an extension every call says "Private Network is not set up" (an explicit
 * result, never a silent fallback).
 */
export class PrivateNetworkRole {
  constructor(private readonly dependencies: Readonly<{ extensions: Pick<ExtensionManager, "enabledProvider" | "callAction"> }>) {}

  async status(): Promise<PrivateNetworkStatus> {
    const answer = await this.call("status");
    if (!isRecord(answer) || !STATES.includes(answer.state as PrivateNetworkState) || typeof answer.message !== "string") throw this.bad("status");
    const machine = isRecord(answer.machine) && text(answer.machine.name) && text(answer.machine.ip, 64) && text(answer.machine.id)
      ? Object.freeze({ name: answer.machine.name, ip: answer.machine.ip, id: answer.machine.id, account: optionalText(answer.machine.account) }) : null;
    return Object.freeze({ state: answer.state as PrivateNetworkState, machine, message: answer.message });
  }

  async machines(): Promise<readonly PrivateNetworkMachine[]> {
    const answer = await this.call("machines");
    if (!Array.isArray(answer)) throw this.bad("machines");
    const machines = answer.map(machineOf);
    if (machines.some((machine) => machine === null)) throw this.bad("machines");
    return Object.freeze(machines as PrivateNetworkMachine[]);
  }

  async relay(): Promise<PrivateNetworkRelay> {
    const answer = await this.call("relay");
    if (!isRecord(answer) || !Number.isInteger(answer.port) || (answer.port as number) < 1 || (answer.port as number) > 65535 || !text(answer.credential)) {
      throw this.bad("relay");
    }
    return Object.freeze({ port: answer.port as number, credential: answer.credential });
  }

  /** Where other machines reach this node: its private address while joined; `null` otherwise or without Private Network. */
  async ownAddress(): Promise<string | null> {
    const status = await this.status().catch((error: unknown) => {
      if (error instanceof PrivateNetworkUnavailableError && error.code === "PRIVATE_NETWORK_NOT_SET_UP") return null;
      throw error;
    });
    return status?.state === "joined" && status.machine ? privateNetworkAddressOf(status.machine.ip) : null;
  }

  /** The machine `id` of the network's current list, or `null` when the network does not list it. */
  async machine(id: string): Promise<PrivateNetworkMachine | null> {
    return (await this.machines()).find((machine) => machine.id === id) ?? null;
  }

  private async call(action: "status" | "machines" | "relay"): Promise<unknown> {
    const id = await this.dependencies.extensions.enabledProvider("private-network");
    if (!id) throw new PrivateNetworkUnavailableError("PRIVATE_NETWORK_NOT_SET_UP", "Private Network is not set up on this node.");
    return this.dependencies.extensions.callAction(id, action, { json: null, bytes: null });
  }

  private bad(action: string): PrivateNetworkUnavailableError {
    return new PrivateNetworkUnavailableError("PRIVATE_NETWORK_BAD_ANSWER", `The Private Network extension answered ${action} in a form this node does not read.`);
  }
}
