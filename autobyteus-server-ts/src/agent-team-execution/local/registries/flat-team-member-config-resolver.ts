import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamRunAgentNode, TeamRunNode } from "../../domain/team-run-config.js";
import type {
  ConfiguredMemberActivationMode,
  FlatTeamExecutionContext,
  FlatTeamMemberExecutionContext,
} from "../flat-team-execution-context.js";

/**
 * Source nodes of a TeamRun's direct Agents: its configured children first, then collaborator
 * Agents the root added after launch (each with the activation mode it was added with).
 */
export class FlatTeamMemberConfigResolver {
  private readonly collaborators = new Map<string, Readonly<{ node: TeamRunAgentNode; mode: ConfiguredMemberActivationMode }>>();

  constructor(private readonly teamContext: TeamRunContext<FlatTeamExecutionContext>) {}

  resolve(context: FlatTeamMemberExecutionContext): TeamRunNode {
    const node = this.teamContext.teamNode.children.find((candidate) => candidate.address === context.address)
      ?? this.collaborators.get(context.address)?.node;
    if (!node || node.kind !== context.kind) {
      throw new Error(`Missing ${context.kind} TeamRun node '${context.address}'.`);
    }
    return node;
  }

  /** A collaborator's own activation mode (`fresh` when added, `restore` when restored); null for configured children. */
  activationModeFor(context: FlatTeamMemberExecutionContext): ConfiguredMemberActivationMode | null {
    return this.collaborators.get(context.address)?.mode ?? null;
  }

  addCollaborator(node: TeamRunAgentNode, mode: ConfiguredMemberActivationMode): void {
    if (this.teamContext.teamNode.children.some((child) => child.address === node.address) || this.collaborators.has(node.address)) {
      throw new Error(`TeamRun '${this.teamContext.teamRunId}' already has an Agent at '${node.address}'.`);
    }
    this.collaborators.set(node.address, Object.freeze({ node, mode }));
  }
}
