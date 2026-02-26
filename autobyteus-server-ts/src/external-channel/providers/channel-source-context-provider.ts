import type {
  ChannelDispatchTarget,
  ChannelSourceContext,
} from "../domain/models.js";

export interface ChannelSourceContextProvider {
  getLatestSourceByAgentRunId(agentRunId: string): Promise<ChannelSourceContext | null>;
  getLatestSourceByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelSourceContext | null>;
  getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null>;
}
