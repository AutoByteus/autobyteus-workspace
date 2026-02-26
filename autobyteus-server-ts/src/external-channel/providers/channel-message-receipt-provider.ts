import type {
  ChannelIngressReceiptInput,
  ChannelTurnReceiptBindingInput,
} from "../domain/models.js";
import type { ChannelSourceContextProvider } from "./channel-source-context-provider.js";

export interface ChannelMessageReceiptProvider
  extends ChannelSourceContextProvider {
  recordIngressReceipt(input: ChannelIngressReceiptInput): Promise<void>;
  bindTurnToReceipt(input: ChannelTurnReceiptBindingInput): Promise<void>;
}
