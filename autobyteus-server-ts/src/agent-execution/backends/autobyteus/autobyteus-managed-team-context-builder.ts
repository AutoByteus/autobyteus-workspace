import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import {
  cloneTeamMemberExecutionIdentity,
  type TeamMemberExecutionIdentity,
} from "../../../agent-team-execution/domain/team-member-execution-identity.js";

export type AutoByteusManagedTeamContext = TeamMemberExecutionIdentity;

export const buildAutoByteusManagedTeamContext = (
  context: MemberTeamContext,
): AutoByteusManagedTeamContext => cloneTeamMemberExecutionIdentity(context.identity);
