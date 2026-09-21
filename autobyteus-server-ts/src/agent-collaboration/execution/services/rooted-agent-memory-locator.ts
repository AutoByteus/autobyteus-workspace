import { appConfigProvider } from "../../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import {
  createRootExecutionPhysicalScope,
  type RootExecutionPhysicalScope,
} from "../domain/root-execution-identity.js";

export type RootedAgentMemoryLocation = Readonly<{
  scope: RootExecutionPhysicalScope;
  agentRunId: string;
  memoryDir: string;
}>;

export class RootedAgentMemoryLocator {
  private readonly layout: AgentMemoryLayout;

  constructor(input: { memoryDir?: string; layout?: AgentMemoryLayout } = {}) {
    this.layout = input.layout ?? new AgentMemoryLayout(
      input.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
  }

  getLocation(scopeInput: RootExecutionPhysicalScope, agentRunIdInput: string): RootedAgentMemoryLocation {
    const scope = createRootExecutionPhysicalScope(scopeInput);
    const agentRunId = agentRunIdInput?.trim();
    if (!agentRunId) throw new Error("agentRunId is required.");
    return Object.freeze({
      scope,
      agentRunId,
      memoryDir: this.layout.getRootedAgentRunDirPath(scope, agentRunId),
    });
  }
}
