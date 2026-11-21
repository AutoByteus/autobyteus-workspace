import { NO_TEAM_DEFINITION_FOLLOWING, type TeamMembershipPlanner } from "../../src/agent-team-execution/membership/team-membership-planner.js";
import { TeamChangeNoticeSource } from "../../src/agent-team-execution/membership/team-change-notice-source.js";

/**
 * The team run manager's membership collaborators for a test whose team runs never follow a changed definition: the
 * planner finds nothing to follow, and the notices are kept but never asked for.
 */
export const teamMembershipTestCollaborators = (): Readonly<{
  membershipPlanner: Pick<TeamMembershipPlanner, "viewFor" | "followStored">;
  changeNotices: TeamChangeNoticeSource;
}> => Object.freeze({
  membershipPlanner: NO_TEAM_DEFINITION_FOLLOWING,
  changeNotices: new TeamChangeNoticeSource(),
});
