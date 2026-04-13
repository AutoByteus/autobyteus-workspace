import type { ChannelReceiptWorkflowState } from "./models.js";

export const isTerminalReceiptWorkflowState = (
  state: ChannelReceiptWorkflowState,
): boolean =>
  state === "PUBLISHED" ||
  state === "UNBOUND" ||
  state === "FAILED" ||
  state === "EXPIRED";

export const isNonTerminalReceiptWorkflowState = (
  state: ChannelReceiptWorkflowState,
): boolean => !isTerminalReceiptWorkflowState(state);
