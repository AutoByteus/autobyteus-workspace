import type { TeamLeafAgentStatusSnapshot } from "../../../domain/team-leaf-agent-status-snapshot.js";
import type { TeamRunEvent } from "../../../domain/team-run-event.js";

/**
 * Rooted addresses and concrete execution addresses are already expressed in
 * the collaboration-root coordinate frame. Child managers forward them
 * unchanged; the old prefix/localization bridge intentionally no longer exists.
 */
export const forwardMixedSubTeamEvent = (event: TeamRunEvent): TeamRunEvent => event;

export const forwardMixedTeamLeafAgentStatusSnapshot = (
  snapshot: TeamLeafAgentStatusSnapshot,
): TeamLeafAgentStatusSnapshot => snapshot;
