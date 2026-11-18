import type { CollaboratorAdmission } from "../../collaborators/collaborator-admission.js";
import type { CollaboratorRootPort } from "../../collaborators/collaborator-root-port.js";
import type { RunOwnAgentsReader } from "../../../run-history/store/run-own-agents-reader.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { RunDelegatedFrom } from "./task-execution-resource-port.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import { runIdentityOf } from "./task-execution-resource-port.js";

/** A delegated run's delegation as its own file records it, with its address: what its last Task entry would say. */
export type RunOwnDelegation = Readonly<{ delegatedFrom: RunDelegatedFrom; recipientAddress: string; entryAgentRunId: string }>;

/**
 * A delegated run no Task names any more (every Task of it was deleted) is still its delegator's (SR-072 F-24, contract
 * §3, model U11): its own file's `delegatedFrom` names the delegator, who may give it a new Task, as base accepted it.
 * The new entry repeats that `delegatedFrom` and the run's own address: the one stored in its file (an agent run's,
 * written at the delegation), else the address its definition has in its delegator's catalog (a team run keeps none).
 * `null` for a run with no local delegator recorded (a run a peer started, or one the user started).
 */
export class RunOwnDelegations {
  constructor(private readonly dependencies: Readonly<{
    files: Pick<RunOwnAgentsReader, "delegationOf">;
    /** A run's collaborator port as `viewerAgentRunId` sees it, live or from its stored files. */
    portOf(run: RootExecutionIdentity, viewerAgentRunId: string): Promise<CollaboratorRootPort | null>;
    admission(): Pick<CollaboratorAdmission, "catalogAddressOf">;
  }>) {}

  async of(execution: TaskExecutionReference): Promise<RunOwnDelegation | null> {
    const record = await this.dependencies.files.delegationOf(runIdentityOf(execution));
    if (!record) return null;
    let address = record.address;
    if (!address) {
      const port = await this.dependencies.portOf(record.delegatedFrom.delegatingRun, record.delegatedFrom.delegatorAgentRunId);
      address = port ? await this.dependencies.admission().catalogAddressOf(port, record.definition) : null;
    }
    return address ? Object.freeze({ delegatedFrom: record.delegatedFrom, recipientAddress: address, entryAgentRunId: record.entryAgentRunId }) : null;
  }
}
