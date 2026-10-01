import type { AgentInputStateDto } from "@autobyteus/agent-presentation-contracts";
/** In-process input projection, not a persisted execution-tree field. */
export type LiveAgentInputSnapshot = Readonly<{ agent_run_id: string; state: AgentInputStateDto }>;
