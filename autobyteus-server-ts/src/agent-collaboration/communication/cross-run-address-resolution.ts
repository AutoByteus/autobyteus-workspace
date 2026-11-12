import type { DelegationTree } from "../delegation/delegation-tree.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runReferenceOf } from "../execution/task/task-execution-resource-port.js";

const NO_LONGER = (address: string) => `${address} is no longer an address: your team is addressed from its own root.`;

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
    /** The relationships, and each run's standing agents (the tree is their one owner, read once per run). */
    tree(): Pick<DelegationTree, "tasksOf" | "assignersOfTasksOf" | "standingOf">;
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
    if ((await this.dependencies.tree().standingOf(receiverRun))?.agents.has(own)) return null;
    return await this.assignersAgent(receiverRun, own) === sender.agentRunId ? own : null;
  }

  /** Step 2: `undefined` when the run has no Task entries; `null` when no assigner has the address. */
  private async assignersAgent(run: RootExecutionIdentity, address: string): Promise<string | null | undefined> {
    const reference = runReferenceOf(run);
    const tree = this.dependencies.tree();
    if (!reference || !tree.tasksOf(reference).length) return undefined;
    for (const assigner of tree.assignersOfTasksOf(reference)) {
      const agentRunId = (await tree.standingOf(assigner))?.agents.get(address);
      if (agentRunId) return agentRunId;
    }
    return null;
  }

  private async correct(run: RootExecutionIdentity, address: string): Promise<void> {
    const reference = runReferenceOf(run);
    const prefixes = [...new Set((reference ? this.dependencies.tree().tasksOf(reference) : []).map((entry) => entry.recipientAddress))].sort();
    const own = await this.dependencies.tree().standingOf(run);
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

