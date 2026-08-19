import type { TeamRunEvent } from "../../../domain/team-run-event.js";
import type { MixedAgentMemberContext, MixedSubTeamMemberContext } from "../mixed-team-run-context.js";
import type { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import type { MixedSubTeamMemberHandle } from "./mixed-sub-team-member-handle.js";

export type MixedConfiguredMemberHandle =
  | MixedAgentMemberHandle
  | MixedSubTeamMemberHandle;

export type MixedConfiguredMemberContext =
  | MixedAgentMemberContext
  | MixedSubTeamMemberContext;

/** Local managers inject one root-owned sink; they never own subscribers. */
export type MixedTeamEventPublish = (event: TeamRunEvent) => void;
