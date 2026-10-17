import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamRunAgentNode } from "../../domain/team-run-config.js";
import type {
  FlatTeamExecutionContext,
  FlatTeamMemberExecutionContext,
} from "../flat-team-execution-context.js";

/** Source nodes of a TeamRun's configured members. */
export class FlatTeamMemberConfigResolver {
  constructor(private readonly teamContext: TeamRunContext<FlatTeamExecutionContext>) {}

  resolve(context: FlatTeamMemberExecutionContext): TeamRunAgentNode {
    const node = this.teamContext.teamNode.children.find((candidate) => candidate.address === context.address);
    if (!node) throw new Error(`Missing agent TeamRun node '${context.address}'.`);
    return node;
  }
}
