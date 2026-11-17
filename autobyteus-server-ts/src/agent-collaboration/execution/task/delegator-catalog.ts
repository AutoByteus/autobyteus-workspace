import type { CollaboratorAdmission } from "../../collaborators/collaborator-admission.js";
import { CollaboratorAddError } from "../../collaborators/collaborator-errors.js";
import type { CollaboratorRootPort } from "../../collaborators/collaborator-root-port.js";
import { sourcedPlacement } from "../../collaborators/catalog-delegation.js";
import { CollaborationContractError } from "../../domain/collaboration-contract-error.js";
import type { AgentTeamAddress } from "../../domain/agent-team-address.js";
import type { DelegationIndex } from "../../delegation/delegation-index.js";
import type { DelegationWork } from "../../../model-routing/domain/model-routing-types.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { runReferenceOf } from "./task-execution-resource-port.js";
import type { LocalDelegationPlacement } from "./task-delegation.js";

/**
 * A delegated run's catalog copy at an address its own catalog does not offer (autobyteus-461 CR-461-041): the catalog
 * copy its delegator's agent would get at that address, with its delegator's launch base and launch notes, as base
 * answered a hosted copy from its host's catalog. One hop; never the run's own definition (it never delegates to
 * itself, U7); `null` for a run no Task names or an address its delegator has no catalog copy at.
 */
export class DelegatorCatalog {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationIndex, "parentOf">;
    /** A run's collaborator port as `viewerAgentRunId` sees it, live or from its stored files. */
    portOf(run: RootExecutionIdentity, viewerAgentRunId: string): Promise<CollaboratorRootPort | null>;
    admission(): Pick<CollaboratorAdmission, "catalogDefinitionAt" | "catalogTaskSource">;
  }>) {}

  async placementAt(input: Readonly<{ senderRun: RootExecutionIdentity; senderAgentRunId: string; address: string; work: DelegationWork;
    folder: string | null }>): Promise<LocalDelegationPlacement | null> {
    const reference = runReferenceOf(input.senderRun);
    const parent = reference ? this.dependencies.tree.parentOf(reference) : null;
    if (!parent) return null;
    const [own, delegator] = await Promise.all([this.dependencies.portOf(input.senderRun, input.senderAgentRunId),
      this.dependencies.portOf(parent.delegatingRun, parent.delegatorAgentRunId)]);
    if (!delegator) return null;
    const admission = this.dependencies.admission();
    const ref = await admission.catalogDefinitionAt(delegator, input.address);
    const ownDefinition = own?.ownDefinition() ?? null;
    if (!ref || (ownDefinition && ownDefinition.kind === ref.kind && ownDefinition.definitionId === ref.definitionId)) return null;
    try {
      const catalog = await admission.catalogTaskSource(delegator, { address: input.address, senderRunId: parent.delegatorAgentRunId,
        work: input.work, workspaceRootPath: input.folder });
      return catalog ? sourcedPlacement(input.address as AgentTeamAddress, catalog.source, catalog) as LocalDelegationPlacement : null;
    } catch (cause) {
      if (cause instanceof CollaboratorAddError) {
        throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `${cause.collaboratorName} can't be delegated to: ${cause.reason.replace(/\.$/, "")}.${cause.nextStep ? ` ${cause.nextStep}` : ""}`);
      }
      throw cause;
    }
  }
}
