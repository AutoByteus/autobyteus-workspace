import type { TeamRunEvent } from "../../../domain/team-run-event.js";

export const prefixMixedSubTeamEvent = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  event: TeamRunEvent;
}): TeamRunEvent => ({
  ...input.event,
  teamRunId: input.parentTeamRunId,
  sourcePath: [...input.sourcePrefix, ...input.event.sourcePath],
  subTeamNodeName: input.sourcePrefix[input.sourcePrefix.length - 1] ?? input.event.subTeamNodeName ?? null,
});
