import type { ChannelTurnReplyRecoveryService } from "../services/channel-turn-reply-recovery-service.js";
import type { ReplyCallbackService } from "../services/reply-callback-service.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { ChannelMessageReceiptService } from "../services/channel-message-receipt-service.js";
import type { ChannelAgentRunReplyBridge } from "./channel-agent-run-reply-bridge.js";
import type { ChannelTeamRunReplyBridge } from "./channel-team-run-reply-bridge.js";

export const RETRY_DELAY_MS = 5_000;

export type ReceiptRuntimeEvent =
  | { type: "PROCESS" }
  | { type: "FINAL_REPLY_READY"; replyText: string }
  | { type: "TURN_COMPLETED" }
  | { type: "WORKFLOW_FAILED"; error: string; state?: "FAILED" | "EXPIRED" }
  | { type: "PUBLISH_SUCCEEDED" }
  | { type: "BINDING_MISSING" };

export type ReceiptWorkflowRuntimeDependencies = {
  messageReceiptService?: ChannelMessageReceiptService;
  agentRunService?: AgentRunService;
  teamRunService?: TeamRunService;
  agentReplyBridge?: ChannelAgentRunReplyBridge;
  teamReplyBridge?: ChannelTeamRunReplyBridge;
  replyCallbackServiceFactory?: () => ReplyCallbackService;
  turnReplyRecoveryService?: ChannelTurnReplyRecoveryService;
};
