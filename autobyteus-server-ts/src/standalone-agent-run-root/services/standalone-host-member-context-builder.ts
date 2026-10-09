import { collaboratorSegmentForName } from "../../agent-collaboration/collaborators/catalog-address-map.js";
import { createAgentTeamAddress, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  MemberCollaborationContext,
  MemberExecutionContext,
} from "../../agent-collaboration/execution/domain/member-execution-context.js";
import {
  createAgentRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { StandaloneAgentRunRoot } from "../domain/standalone-agent-run-root.js";

const ROOT_NOT_ACTIVE = "The collaboration root of this run is not active.";

/**
 * Builds the host member context of an eligible standalone run; its root passes it to the host's
 * activation. Tool calls resolve the run's active root at call time, so a root that is replaced
 * (after a fail-stop) or stopped answers for itself.
 */
export class StandaloneHostMemberContextBuilder {
  constructor(private readonly options: Readonly<{
    definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    getActiveRoot(hostRunId: string): StandaloneAgentRunRoot | null;
    readStoredHostAddress(hostRunId: string): Promise<AgentTeamAddress | null>;
  }>) {}

  /** The host address: the package's (stable once created), else derived from the definition name. */
  async resolveHostAddress(metadata: AgentRunMetadata): Promise<AgentTeamAddress> {
    const stored = this.options.getActiveRoot(metadata.runId)?.hostAddress
      ?? await this.options.readStoredHostAddress(metadata.runId);
    if (stored) return stored;
    const definition = await this.options.definitions.getAgentDefinitionById(metadata.agentDefinitionId).catch(() => null);
    return createAgentTeamAddress([collaboratorSegmentForName(definition?.name ?? metadata.agentDefinitionId)]);
  }

  async build(metadata: AgentRunMetadata): Promise<MemberExecutionContext> {
    const root = createAgentRootExecutionIdentity(metadata.runId);
    const identity = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: await this.resolveHostAddress(metadata),
      agentRunId: metadata.runId,
    });
    return new MemberExecutionContext({
      identity,
      teamScoped: false,
      authoredEnclosingScopeInstruction: null,
      collaboration: new MemberCollaborationContext({
        deliverLogicalMessage: async (message) => {
          const active = this.options.getActiveRoot(metadata.runId);
          return active
            ? active.deliverLogicalMessage(identity, message)
            : { accepted: false, code: "COLLABORATION_ROOT_NOT_ACTIVE", message: ROOT_NOT_ACTIVE };
        },
        listAvailableAgents: async () => {
          const active = this.options.getActiveRoot(metadata.runId);
          if (!active) throw new Error(ROOT_NOT_ACTIVE);
          return active.listAvailableAgents(identity);
        },
      }),
      tasks: Object.freeze({
        root,
        delegateToNewCopy: async (caller, input) => {
          const active = this.options.getActiveRoot(metadata.runId);
          return active ? active.delegateToNewCopy({ identity: caller }, input) : { delegated: false, message: ROOT_NOT_ACTIVE };
        },
        assignToExistingCopy: async (caller, input) => {
          const active = this.options.getActiveRoot(metadata.runId);
          return active ? active.assignToExistingCopy({ identity: caller }, input) : { delegated: false, message: ROOT_NOT_ACTIVE };
        },
      }),
    });
  }
}
