import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputOptions } from "../../agent-execution/input/agent-run-input-contract.js";

export type TeamMemberExecutionCommand =
  | Readonly<{
      kind: "post_message";
      message: AgentInputUserMessage;
      /** Passed to `AgentRun.postUserMessage` unchanged (autobyteus-285: the restart notice's observer and `onlyAsFirstInput`). */
      postOptions?: AgentRunInputOptions;
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
