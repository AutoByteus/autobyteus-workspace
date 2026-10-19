import { appConfigProvider } from "../../../config/app-config-provider.js";
import type { AgentRunMemoryPlacement } from "../../../agent-memory/domain/agent-run-memory-placement.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";

/** Thin seam over the placement rule and the layout, injected where handles and adapters need a memory directory. */
export class AgentRunMemoryLocator {
  private readonly layout: AgentMemoryLayout;

  constructor(input: { memoryDir?: string; layout?: AgentMemoryLayout } = {}) {
    this.layout = input.layout ?? new AgentMemoryLayout(
      input.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  getMemoryDir(placement: AgentRunMemoryPlacement, agentRunIdInput: string): string {
    const agentRunId = agentRunIdInput?.trim();
    if (!agentRunId) throw new Error("agentRunId is required.");
    return this.layout.getAgentRunMemoryDirPath(placement, agentRunId);
  }
}
