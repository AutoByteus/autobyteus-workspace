import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamRunNode } from "../../domain/team-run-config.js";
import type { FlatTeamExecutionContext, FlatTeamMemberExecutionContext } from "../flat-team-execution-context.js";

export class FlatTeamMemberConfigResolver {
  constructor(private readonly teamContext: TeamRunContext<FlatTeamExecutionContext>) {}

  resolve(context: FlatTeamMemberExecutionContext): TeamRunNode {
    const node = this.teamContext.teamNode.children.find((candidate) => candidate.address === context.address);
    if (!node || node.kind !== context.kind) {
      throw new Error(`Missing ${context.kind} TeamRun node '${context.address}'.`);
    }
    return node;
  }
}
