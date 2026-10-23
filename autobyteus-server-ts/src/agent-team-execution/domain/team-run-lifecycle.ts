/**
 * How a Team root ended (autobyteus-278): a quiet idle shutdown of a peer-started Team (the next message restores it
 * as a new root) or a stop (an explicit stop or terminate, a history delete or archive, a fail-stop, server shutdown).
 */
export type TeamRunEnding = "idle_shutdown" | "stopped";

export type TeamRunLifecycleSnapshot = {
  teamRunId: string;
  isActive: boolean;
  /** Set when this snapshot reports the root ending; `null` for an activation or a read of the current state. */
  ending: TeamRunEnding | null;
};

export type TeamRunLifecycleListener = (
  snapshot: TeamRunLifecycleSnapshot,
) => void;

export type TeamRunLifecycleUnsubscribe = () => void;
