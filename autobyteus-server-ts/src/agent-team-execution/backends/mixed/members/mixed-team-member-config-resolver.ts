import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunMemberConfig } from "../../../domain/team-run-config.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";

export class MixedTeamMemberConfigResolver {
  constructor(private readonly teamContext: TeamRunContext<MixedTeamRunContext>) {}

  resolve(context: MixedTeamMemberContext): TeamRunMemberConfig {
    const stack = [...(this.teamContext.config?.memberTree ?? [])];
    while (stack.length > 0) {
      const member = stack.shift()!;
      if (
        member.memberRouteKey === context.memberRouteKey ||
        member.memberRunId === context.memberRunId
      ) {
        return member;
      }
      if (member.memberKind === "agent_team") {
        stack.push(...member.memberConfigs);
      }
    }
    throw new Error(`Missing member config for '${context.memberRouteKey}'.`);
  }
}
