import {
  getRuntimeCommandIngressService,
  type RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import type { RuntimeCommandResult } from "../../runtime-execution/runtime-adapter-port.js";

export interface TeamRuntimeInterAgentRelayInput {
  teamRunId: string;
  recipientMemberRunId: string;
  senderAgentRunId: string;
  senderAgentName?: string | null;
  recipientName: string;
  messageType?: string | null;
  content: string;
  metadata?: Record<string, unknown> | null;
}

export class TeamRuntimeInterAgentMessageRelay {
  private readonly runtimeCommandIngressService: RuntimeCommandIngressService;

  constructor(
    runtimeCommandIngressService: RuntimeCommandIngressService = getRuntimeCommandIngressService(),
  ) {
    this.runtimeCommandIngressService = runtimeCommandIngressService;
  }

  async deliverInterAgentMessage(
    input: TeamRuntimeInterAgentRelayInput,
  ): Promise<RuntimeCommandResult> {
    const result = await this.runtimeCommandIngressService.relayInterAgentMessage({
      runId: input.recipientMemberRunId,
      envelope: {
        senderAgentRunId: input.senderAgentRunId,
        senderAgentName: input.senderAgentName ?? null,
        recipientName: input.recipientName,
        messageType: (input.messageType ?? "agent_message").trim() || "agent_message",
        content: input.content,
        teamRunId: input.teamRunId,
        metadata: input.metadata ?? null,
      },
    });
    return {
      accepted: result.accepted,
      code: result.code,
      message: result.message,
    };
  }
}

let cachedTeamRuntimeInterAgentMessageRelay: TeamRuntimeInterAgentMessageRelay | null = null;

export const getTeamRuntimeInterAgentMessageRelay = (): TeamRuntimeInterAgentMessageRelay => {
  if (!cachedTeamRuntimeInterAgentMessageRelay) {
    cachedTeamRuntimeInterAgentMessageRelay = new TeamRuntimeInterAgentMessageRelay();
  }
  return cachedTeamRuntimeInterAgentMessageRelay;
};
