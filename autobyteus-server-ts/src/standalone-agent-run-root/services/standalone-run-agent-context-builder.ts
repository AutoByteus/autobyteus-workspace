import { collaboratorSegmentForName } from "../../agent-collaboration/collaborators/catalog-address-map.js";
import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
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
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";


/**
 * Builds the agent member context of an eligible standalone run; its root passes it to the agent's
 * activation. Its role, and an org copy's handoff rules and instruction, come from the run's collaboration tree. Tool calls resolve the run's active root at call time, so a root that is replaced
 * (after a fail-stop) or stopped answers for itself.
 */
export class StandaloneRunAgentContextBuilder {
  constructor(private readonly options: Readonly<{
    definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    /** The run's collaboration tree: a task agent when delegated, and what an org copy inherits (SR-058, SR-060). */
    tree: Pick<DelegationIndex, "collaborationTreeOf">;
    orgInstruction(orgDefinitionId: string): Promise<string | null>;
    getActiveRoot(agentRunId: string): StandaloneAgentRunRoot | null;
    readStoredAgentAddress(agentRunId: string): Promise<AgentTeamAddress | null>;
  }>) {}

  /** The agent's address: the package's (stable once created), else derived from the definition name. */
  async resolveAgentAddress(metadata: AgentRunMetadata): Promise<AgentTeamAddress> {
    const stored = this.options.getActiveRoot(metadata.runId)?.agentAddress
      ?? await this.options.readStoredAgentAddress(metadata.runId);
    if (stored) return stored;
    const definition = await this.options.definitions.getAgentDefinitionById(metadata.agentDefinitionId).catch(() => null);
    return createAgentTeamAddress([collaboratorSegmentForName(definition?.name ?? metadata.agentDefinitionId)]);
  }

  async build(metadata: AgentRunMetadata): Promise<MemberExecutionContext> {
    const root = createAgentRootExecutionIdentity(metadata.runId);
    const identity = createCollaborationMemberExecutionIdentity({
      root,
      memberAddress: await this.resolveAgentAddress(metadata),
      agentRunId: metadata.runId,
    });
    // SR-058: a delegated run's agent is a task agent; a copy of an org's configured agent keeps its rules and instruction.
    const collaboration = await this.options.tree.collaborationTreeOf(root).agentCollaboration();
    const instruction = collaboration.placement ? await this.options.orgInstruction(collaboration.placement.orgDefinitionId) : null;
    return new MemberExecutionContext({
      identity,
      // Team-scoped where base's hosted copy was (CR-461-114): its tree starts at a Team or an Org run.
      teamScoped: collaboration.teamScoped,
      collaborationRole: collaboration.role,
      inOrganization: false,
      authoredEnclosingScopeInstruction: instruction,
      collaboration: new MemberCollaborationContext({
        outgoingHandoffs: () => collaboration.placement?.handoffs ?? [],
        deliverLogicalMessage: async (message) => {
          const active = this.options.getActiveRoot(metadata.runId);
          return active
            ? active.deliverLogicalMessage(identity, message)
            : { accepted: false, code: "COLLABORATION_ROOT_NOT_ACTIVE", message: ROOT_NOT_ACTIVE_MESSAGE };
        },
        listAvailableAgents: async () => {
          const active = this.options.getActiveRoot(metadata.runId);
          if (!active) throw new Error(ROOT_NOT_ACTIVE_MESSAGE);
          return active.listAvailableAgents(identity);
        },
      }),
      tasks: Object.freeze({
        root,
        delegationSource: async (caller) => {
          const active = this.options.getActiveRoot(metadata.runId);
          return active ? active.delegationSource({ identity: caller }) : { delegated: false, message: ROOT_NOT_ACTIVE_MESSAGE };
        },
        ownedTaskOf: (caller) => {
          // An inactive root can't say which Task the caller works on: refuse rather than answer "none".
          const active = this.options.getActiveRoot(metadata.runId);
          if (!active) throw new Error(ROOT_NOT_ACTIVE_MESSAGE);
          return active.ownedTaskOf({ identity: caller });
        },
      }),
    });
  }
}
