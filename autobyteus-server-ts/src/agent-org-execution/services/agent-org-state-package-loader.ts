import type { AgentOrgRunExecutionTreeStore } from "../../run-history/store/agent-org-run-execution-tree-store.js";
import type { AgentOrgCommunicationMessagesV1Store } from "../persistence/agent-org-communication-messages-v1-store.js";
import { validateAgentOrgStatePackage, type ValidatedAgentOrgStatePackage } from "./agent-org-state-package-validator.js";

export type AgentOrgStatePackageLoadResult =
  | Readonly<{ loaded: true; state: ValidatedAgentOrgStatePackage }>
  | Readonly<{ loaded: false; code: string; message: string }>;

/**
 * Reopen reads the current tree and messages only. No repair is needed: every
 * delegated child starts shut down (no runtime handle) and wakes on a message.
 */
export class AgentOrgStatePackageLoader {
  constructor(private readonly stores: {
    executionTree: AgentOrgRunExecutionTreeStore;
    messages: AgentOrgCommunicationMessagesV1Store;
  }) {}

  async load(input: { orgMemoryDir: string; orgRunId: string }): Promise<AgentOrgStatePackageLoadResult> {
    const [tree, messages] = await Promise.all([
      this.stores.executionTree.read(input.orgMemoryDir, input.orgRunId),
      this.stores.messages.read(input.orgMemoryDir, input.orgRunId),
    ]);
    if (!tree || !messages) return {
      loaded: false,
      code: "AGENT_ORG_STATE_PACKAGE_INCOMPLETE",
      message: `AgentOrg '${input.orgRunId}' requires its strict current tree and communication messages.`,
    };
    return Object.freeze({
      loaded: true,
      state: validateAgentOrgStatePackage({ executionTree: tree, communicationMessages: messages }),
    });
  }
}
