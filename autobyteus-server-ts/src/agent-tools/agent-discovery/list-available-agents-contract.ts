import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { MemberCollaborationContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";

export const LIST_AVAILABLE_AGENTS_TOOL_NAME = "list_available_agents";

/** The same wording on every runtime (local tool and Agent Tools MCP); wording authority §6. */
export const LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION =
  "List the agents and agent teams you can work with, each with its name, kind (agent or agent_team), address and description. This read-only tool takes no arguments.";

export type AvailableAgentEntry = Readonly<{
  name: string;
  kind: "agent" | "agent_team";
  address: string;
  description: string;
}>;

export type ListAvailableAgentsResult = Readonly<{ agents: readonly AvailableAgentEntry[] }>;

export const buildListAvailableAgentsParameterSchema = (): ParameterSchema => new ParameterSchema([]);

/** The sender's root answers (DS-001); the handler adds nothing and writes nothing. */
export const listAvailableAgentsFor = async (
  collaboration: MemberCollaborationContext | null | undefined,
): Promise<ListAvailableAgentsResult> => {
  const lister = collaboration?.listAvailableAgents;
  if (!lister) {
    throw new CollaborationContractError(
      "COLLABORATION_CONTEXT_REQUIRED",
      "list_available_agents requires an agent run that can delegate to available agents.",
    );
  }
  const agents = await lister();
  return Object.freeze({
    agents: Object.freeze(agents.map((entry) => Object.freeze({
      name: entry.name,
      kind: entry.kind,
      address: entry.address,
      description: entry.description,
    }))),
  });
};
