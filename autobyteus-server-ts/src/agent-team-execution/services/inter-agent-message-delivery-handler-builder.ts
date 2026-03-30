import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { InterAgentMessageDeliveryHandler } from "../domain/inter-agent-message-delivery.js";

type TeamRunLike = {
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler;
};

type TeamRunResolver = {
  getActiveRun: (teamRunId: string) => TeamRunLike | null;
};

export const buildInterAgentMessageDeliveryHandler = (
  teamRunId: string | null | undefined,
  teamRunResolver: TeamRunResolver,
): InterAgentMessageDeliveryHandler | null => {
  if (typeof teamRunId !== "string" || teamRunId.trim().length === 0) {
    return null;
  }

  return async (request): Promise<AgentOperationResult> => {
    const teamRun = teamRunResolver.getActiveRun(teamRunId);
    if (!teamRun) {
      return {
        accepted: false,
        code: "RUN_NOT_FOUND",
        message: "Team run is unavailable.",
      };
    }

    return teamRun.deliverInterAgentMessage(request);
  };
};
