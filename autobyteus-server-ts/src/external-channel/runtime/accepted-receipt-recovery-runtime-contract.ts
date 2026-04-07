import type { ChannelMessageReceipt } from "../domain/models.js";

export type AcceptedTurnCorrelation = {
  agentRunId: string | null;
  teamRunId: string | null;
  turnId: string;
};

export type AcceptedDispatchTurnCapture = {
  consumeCapturedCorrelation: () => AcceptedTurnCorrelation | null;
  attachAcceptedReceipt: (receipt: ChannelMessageReceipt) => Promise<void>;
  dispose: () => void;
};
