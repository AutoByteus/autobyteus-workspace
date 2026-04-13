import type { ChannelMessageReceipt } from "../domain/models.js";

export type ReceiptWorkflowTransition =
  Partial<
    Pick<
      ChannelMessageReceipt,
      | "workflowState"
      | "turnId"
      | "agentRunId"
      | "teamRunId"
      | "replyTextFinal"
      | "lastError"
    >
  >;

export type ReceiptWorkflowEvent =
  | { type: "LIVE_OBSERVATION_STARTED" }
  | { type: "TURN_COMPLETED" }
  | { type: "FINAL_REPLY_READY"; replyText: string }
  | { type: "PUBLISH_REQUESTED" }
  | { type: "PUBLISH_SUCCEEDED" }
  | { type: "BINDING_MISSING" }
  | { type: "WORKFLOW_FAILED"; error: string; state?: "FAILED" | "EXPIRED" };

export const reduceReceiptWorkflow = (
  receipt: Pick<
    ChannelMessageReceipt,
    | "workflowState"
    | "turnId"
    | "agentRunId"
    | "teamRunId"
    | "replyTextFinal"
    | "lastError"
  >,
  event: ReceiptWorkflowEvent,
): ReceiptWorkflowTransition => {
  switch (event.type) {
    case "LIVE_OBSERVATION_STARTED":
      return {
        workflowState: "COLLECTING_REPLY",
        lastError: null,
      };
    case "TURN_COMPLETED":
      return {
        workflowState: "TURN_COMPLETED",
        lastError: null,
      };
    case "FINAL_REPLY_READY":
      return {
        workflowState: "REPLY_FINALIZED",
        replyTextFinal: event.replyText,
        lastError: null,
      };
    case "PUBLISH_REQUESTED":
      return {
        workflowState: "PUBLISH_PENDING",
        lastError: null,
      };
    case "PUBLISH_SUCCEEDED":
      return {
        workflowState: "PUBLISHED",
        lastError: null,
      };
    case "BINDING_MISSING":
      return {
        workflowState: "UNBOUND",
        lastError: null,
      };
    case "WORKFLOW_FAILED":
      return {
        workflowState: event.state ?? "FAILED",
        lastError: event.error,
      };
    default:
      return {};
  }
};
