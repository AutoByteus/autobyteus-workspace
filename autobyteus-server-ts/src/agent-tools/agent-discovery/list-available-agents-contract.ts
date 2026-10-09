import { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { MemberCollaborationContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";

export const LIST_AVAILABLE_AGENTS_TOOL_NAME = "list_available_agents";

/** REQ-009: the same wording on every runtime (local tool and Agent Tools MCP). */
export const LIST_AVAILABLE_AGENTS_TOOL_DESCRIPTION = [
  "List the shared agents and agent teams you can work with, each with its name, kind",
  "(agent or agent_team), address and description. send_message_to with an address reaches",
  "the one instance at that address and brings it into the run on first use; delegate_task",
  "with an address spawns a new copy (with a copy's own ID it gives that copy a new Task);",
  "message a copy by its agent run ID (a Team copy's coordinator).",
  "This read-only tool takes no arguments.",
].join(" ");

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
      "list_available_agents requires an agent run that can bring in collaborators.",
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
