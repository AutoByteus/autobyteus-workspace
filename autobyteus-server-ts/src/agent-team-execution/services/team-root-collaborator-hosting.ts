import {
  projectCollaboratorAgentNode,
  projectCollaboratorTeamNode,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRun } from "../domain/team-run.js";
import type { FlatTeamCollaboratorHost } from "../local/flat-team-execution-factory.js";
import type { ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";

/**
 * Prepares the hosted executions of collaborator entries in a Team root (AR-006): a
 * collaborator Agent becomes a direct Agent of the root TeamRun, a collaborator Team one
 * TeamRun under it (registered with the root's TeamRun resolver on commit). Nothing starts a
 * runtime; the first message does.
 */
export const prepareTeamRootCollaborators = async (input: Readonly<{
  host: FlatTeamCollaboratorHost;
  registerTeamRun(run: TeamRun): void;
  entries: readonly CollaboratorEntry[];
  mode: ConfiguredMemberActivationMode;
}>): Promise<PreparedCollaboratorHandles> => {
  const prepared: Array<Readonly<{ commit(): void; abort(): Promise<void> }>> = [];
  try {
    for (const entry of input.entries) {
      if (entry.kind === "agent") {
        const agent = input.host.prepareCollaboratorAgent(projectCollaboratorAgentNode(entry), input.mode);
        prepared.push(Object.freeze({ commit: agent.commit, abort: async () => undefined }));
        continue;
      }
      const team = await input.host.prepareCollaboratorTeam({
        teamNode: projectCollaboratorTeamNode(entry),
        handoffs: entry.handoffs,
        mode: input.mode,
      });
      prepared.push(Object.freeze({
        commit: () => {
          team.commit();
          input.registerTeamRun(team.run);
        },
        abort: team.abort,
      }));
    }
  } catch (error) {
    for (const handle of [...prepared].reverse()) await handle.abort().catch(() => undefined);
    throw error;
  }
  return Object.freeze({
    commitAfterDurability: () => prepared.forEach((handle) => handle.commit()),
    abort: async () => {
      for (const handle of [...prepared].reverse()) await handle.abort().catch(() => undefined);
    },
  });
};
