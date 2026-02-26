import type {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
} from "autobyteus-ts/agent-team/events/agent-team-events.js";
import { dispatchWithTeamLocalRoutingPort } from "../routing/worker-local-dispatch.js";
import type { TeamLike } from "./runtime-team-resolution.js";

export type HostRuntimeRoutingDispatchers = {
  dispatchLocalUserMessage: (event: ProcessUserMessageEvent) => Promise<void>;
  dispatchLocalInterAgentMessage: (event: InterAgentMessageRequestEvent) => Promise<void>;
  dispatchLocalToolApproval: (event: ToolApprovalTeamEvent) => Promise<void>;
  dispatchLocalControlStop: () => Promise<void>;
};

export const createHostRuntimeRoutingDispatchers = (input: {
  teamRunId: string;
  resolveHostRuntimeTeam: (teamRunId: string) => TeamLike;
}): HostRuntimeRoutingDispatchers => {
  const resolveTeam = (): TeamLike => input.resolveHostRuntimeTeam(input.teamRunId);

  return {
    dispatchLocalUserMessage: async (event) => {
      const team = resolveTeam();
      await dispatchWithTeamLocalRoutingPort({
        team,
        contextLabel: `Run '${input.teamRunId}'`,
        dispatch: async (localRoutingPort) => localRoutingPort.dispatchUserMessage(event),
      });
    },
    dispatchLocalInterAgentMessage: async (event) => {
      const team = resolveTeam();
      await dispatchWithTeamLocalRoutingPort({
        team,
        contextLabel: `Run '${input.teamRunId}'`,
        dispatch: async (localRoutingPort) =>
          localRoutingPort.dispatchInterAgentMessageRequest(event),
      });
    },
    dispatchLocalToolApproval: async (event) => {
      const team = resolveTeam();
      await dispatchWithTeamLocalRoutingPort({
        team,
        contextLabel: `Run '${input.teamRunId}'`,
        dispatch: async (localRoutingPort) => localRoutingPort.dispatchToolApproval(event),
      });
    },
    dispatchLocalControlStop: async () => {
      const team = resolveTeam();
      if (typeof team.stop === "function") {
        await team.stop();
      }
    },
  };
};
