import type { DelegationTree } from "../delegation/delegation-tree.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runReferenceOf } from "../execution/task/task-execution-resource-port.js";
import type { RunStanding } from "../../run-history/store/run-own-agents-reader.js";

/** A run's standing agents, read from its own file (`RunOwnAgentsReader.standingOf`). */
export type RunStandingReader = Readonly<{ standingOf(run: RootExecutionIdentity): Promise<RunStanding | null> }>;

const NO_LONGER = (address: string) => `${address} is no longer an address: your team is addressed from its own root.`;
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
/** The model's order of runs: (kind, run ID), by code point. */
const byRun = (a: RootExecutionIdentity, b: RootExecutionIdentity): number =>
  compare(a.rootSubjectKind, b.rootSubjectKind) || compare(a.rootRunId, b.rootRunId);

/**
 * `send_message_to(address)` beyond the sender's own run (contract §2.3, `model.py` `resolve`). The sender's root
 * resolves steps 1 and 3 (its own team, its own run's standing agents) and the self refusal; when that misses, a run
 * that works on a Task (it has Task entries) continues here:
 * - step 2: the standing agents of the runs that assigned its Tasks (its open Tasks in Task-ID order, else all its
 *   Tasks; the assigners in run order);
 * - then, for a team run, the correction of an address under the name the team was delegated to (its entries'
 *   `recipientAddress`): it is refused with the address to use, never resolved (SR-036; after step 2, ARCH-REV-011).
 * A run without Task entries (a run the user started, a run whose Task was deleted) is not this resolution's: `null`.
 */
export class CrossRunAddressResolution {
  constructor(private readonly dependencies: Readonly<{
    tree(): Pick<DelegationTree, "tasksOf" | "assignersOf">;
    standing: RunStandingReader;
  }>) {}

  /** The receiving agent's run ID; `null` when the sender's run has no Task entries. Refusals throw. */
  async resolve(sender: CollaborationMemberExecutionIdentity, address: string): Promise<string | null> {
    const found = await this.assignersAgent(sender.root, address);
    if (found === undefined) return null;
    if (found) return found;
    if (sender.root.rootSubjectKind === "agent_team") await this.correct(sender.root, address);
    return null;
  }

  /**
   * The sender's own address as the receiver may use it (contract §2.4, `model.py` `reaching_address`): only when the
   * receiver's resolution of it reaches the sender. A receiver resolves its own run's addresses first (steps 1 and 3,
   * or the self refusal), so an address its own run has never reaches another run.
   */
  async reachingAddress(sender: CollaborationMemberExecutionIdentity, receiverRun: RootExecutionIdentity): Promise<string | null> {
    const own = sender.memberAddress as string;
    if ((await this.dependencies.standing.standingOf(receiverRun))?.agents.has(own)) return null;
    return await this.assignersAgent(receiverRun, own) === sender.agentRunId ? own : null;
  }

  /** Step 2: `undefined` when the run has no Task entries; `null` when no assigner has the address. */
  private async assignersAgent(run: RootExecutionIdentity, address: string): Promise<string | null | undefined> {
    const reference = runReferenceOf(run);
    const tree = this.dependencies.tree();
    const entries = reference ? tree.tasksOf(reference) : [];
    if (!entries.length) return undefined;
    const open = [...new Set(entries.filter((entry) => entry.open).map((entry) => entry.taskId))].sort();
    const taskIds = open.length ? open : [...new Set(entries.map((entry) => entry.taskId))].sort();
    for (const taskId of taskIds) {
      for (const assigner of [...tree.assignersOf(taskId)].sort(byRun)) {
        const agentRunId = (await this.dependencies.standing.standingOf(assigner))?.agents.get(address);
        if (agentRunId) return agentRunId;
      }
    }
    return null;
  }

  private async correct(run: RootExecutionIdentity, address: string): Promise<void> {
    const reference = runReferenceOf(run);
    const prefixes = [...new Set((reference ? this.dependencies.tree().tasksOf(reference) : []).map((entry) => entry.recipientAddress))].sort();
    const own = await this.dependencies.standing.standingOf(run);
    for (const prefix of prefixes) {
      if (address === prefix && own?.coordinatorAddress) {
        throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND",
          `${NO_LONGER(address)} Your team as a whole has no address; its coordinator is ${own.coordinatorAddress}.`);
      }
      const rest = address.slice(prefix.length);
      if (address.startsWith(`${prefix}/`) && own?.agents.has(rest)) {
        throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `${NO_LONGER(address)} Use ${rest}.`);
      }
    }
  }
}

let bound: CrossRunAddressResolution | null = null;
export const bindCrossRunAddressResolution = (resolution: CrossRunAddressResolution): void => { bound = resolution; };
export const unbindCrossRunAddressResolution = (resolution: CrossRunAddressResolution): void => { if (bound === resolution) bound = null; };
/** The process resolution; `null` where collaboration is not composed (an address then resolves in the sender's run only). */
export const findCrossRunAddressResolution = (): CrossRunAddressResolution | null => bound;
