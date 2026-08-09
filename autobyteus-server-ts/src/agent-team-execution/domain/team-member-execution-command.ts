import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";

export type TeamMemberExecutionCommand =
  | Readonly<{
      kind: "post_message";
      message: AgentInputUserMessage;
    }>
  | Readonly<{
      kind: "approve_tool";
      invocationId: string;
      approved: boolean;
      reason: string | null;
    }>
  | Readonly<{
      kind: "interrupt";
    }>;
