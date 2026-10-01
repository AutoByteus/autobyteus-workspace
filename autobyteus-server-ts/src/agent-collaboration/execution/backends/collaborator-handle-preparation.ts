import {
  projectCollaboratorAgentNode,
  projectCollaboratorTeamNode,
} from "../../collaborators/collaborator-source-projector.js";
import type { CollaboratorEntry } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { FlatTeamExecutionCallbacks } from "../../../agent-team-execution/local/flat-team-execution-callbacks.js";
import { createRootExecutionPhysicalScope, type RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { ConfiguredAgentActivationMode } from "../domain/configured-agent-execution.js";
import type { RootAgentExecutionRegistry } from "./root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "./root-team-execution-directory.js";

export type PreparedCollaboratorHandles = Readonly<{
  /** Publishes the prepared handles (Offline); call after the tree write is durable. */
  commitAfterDurability(): void;
  abort(): Promise<void>;
}>;

/**
 * Prepares the hosted executions of collaborator entries in a root that hosts Agents in a
 * `RootAgentExecutionRegistry` and Teams in a `RootTeamExecutionDirectory` (Org and Agent
 * roots): a collaborator Agent as a configured-agent handle, a collaborator Team as one
 * mounted-style TeamRun with lazily prepared members. Nothing starts a runtime; the first
 * message does. On failure every handle prepared so far is aborted.
 */
export const prepareCollaboratorHandles = async (input: Readonly<{
  root: RootExecutionIdentity;
  rootAgents: RootAgentExecutionRegistry;
  teams: RootTeamExecutionDirectory;
  /** Callbacks for collaborator Team members (their handoffs and instruction). */
  teamCallbacks: FlatTeamExecutionCallbacks;
  entries: readonly CollaboratorEntry[];
  mode: ConfiguredAgentActivationMode;
}>): Promise<PreparedCollaboratorHandles> => {
  const prepared: PreparedCollaboratorHandles[] = [];
  try {
    for (const entry of input.entries) {
      if (entry.kind === "agent") {
        prepared.push(await input.rootAgents.prepareConfigured(projectCollaboratorAgentNode(entry), input.mode));
        continue;
      }
      const teamNode = projectCollaboratorTeamNode(entry);
      prepared.push(await input.teams.prepareConfigured({
        physicalScope: createRootExecutionPhysicalScope({ root: input.root, ancestorTeamRunIds: [teamNode.teamRunId] }),
        teamNode,
        handoffs: entry.handoffs,
        callbacks: input.teamCallbacks,
        activationMode: input.mode,
      }));
    }
  } catch (error) {
    for (const handle of [...prepared].reverse()) await handle.abort().catch(() => undefined);
    throw error;
  }
  return Object.freeze({
    commitAfterDurability: () => prepared.forEach((handle) => handle.commitAfterDurability()),
    abort: async () => {
      for (const handle of [...prepared].reverse()) await handle.abort().catch(() => undefined);
    },
  });
};
