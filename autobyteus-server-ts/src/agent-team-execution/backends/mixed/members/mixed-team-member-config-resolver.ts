import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunNode } from "../../../domain/team-run-config.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";

export class MixedTeamMemberConfigResolver {
  constructor(private readonly teamContext: TeamRunContext<MixedTeamRunContext>) {}

  resolve(context: MixedTeamMemberContext): TeamRunNode {
    const node = this.teamContext.teamNode.children.find((candidate) => candidate.address === context.address);
    if (!node || node.kind !== context.kind) {
      throw new Error(`Missing ${context.kind} TeamRun node '${context.address}'.`);
    }
    return node;
  }
}
