import type { ConfiguredExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { repairTaskExecutionForestOnRootReopen, repairTaskRecordsOnRootReopen } from "../../agent-collaboration/execution/task/root-task-reopen-repair.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunExecutionTreeStore } from "../../run-history/store/agent-org-run-execution-tree-store.js";
import type { AgentOrgTaskDelegationRecordsV1Store } from "../persistence/agent-org-task-delegation-records-v1-store.js";
import type { AgentOrgCommunicationMessagesV1Store } from "../persistence/agent-org-communication-messages-v1-store.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../run-history/store/agent-org-run-execution-tree-schema.js";
import { validateAgentOrgTaskDelegationRecordsV1 } from "../persistence/agent-org-task-delegation-records-v1-schema.js";
import { validateAgentOrgStatePackage, type ValidatedAgentOrgStatePackage } from "./agent-org-state-package-validator.js";

export type AgentOrgStatePackageLoadResult =
  | Readonly<{ loaded: true; state: ValidatedAgentOrgStatePackage; repaired: boolean }>
  | Readonly<{ loaded: false; code: string; message: string }>;

export class AgentOrgStatePackageLoader {
  constructor(private readonly stores: {
    executionTree: AgentOrgRunExecutionTreeStore;
    tasks: AgentOrgTaskDelegationRecordsV1Store;
    messages: AgentOrgCommunicationMessagesV1Store;
  }) {}

  async loadAndRepair(input: {
    orgMemoryDir: string;
    orgRunId: string;
    recoveryTimestamp?: string;
  }): Promise<AgentOrgStatePackageLoadResult> {
    const [tree, tasks, messages] = await Promise.all([
      this.stores.executionTree.read(input.orgMemoryDir, input.orgRunId),
      this.stores.tasks.read(input.orgMemoryDir, input.orgRunId),
      this.stores.messages.read(input.orgMemoryDir, input.orgRunId),
    ]);
    if (!tree || !tasks || !messages) return {
      loaded: false,
      code: "AGENT_ORG_STATE_PACKAGE_INCOMPLETE",
      message: `AgentOrg '${input.orgRunId}' requires its strict V1 tree and both Org sidecars.`,
    };
    const recovered = repairTaskRecordsOnRootReopen({
      records: tasks.records,
      recoveryTimestamp: input.recoveryTimestamp ?? new Date().toISOString(),
      rootLabel: "AgentOrg",
    });
    const recoveredTree = this.repairTree(tree, recovered);
    const recoveredTasks = validateAgentOrgTaskDelegationRecordsV1({
      ...tasks,
      records: recovered.records,
    }, input.orgRunId);
    const treeChanged = JSON.stringify(tree) !== JSON.stringify(recoveredTree);
    const tasksChanged = JSON.stringify(tasks) !== JSON.stringify(recoveredTasks);
    if (treeChanged) {
      const result = await this.stores.executionTree.write(input.orgMemoryDir, recoveredTree);
      if (result.outcome !== "committed") return this.failed(input.orgRunId, result.outcome);
    }
    if (tasksChanged) {
      const result = await this.stores.tasks.write(input.orgMemoryDir, recoveredTasks);
      if (result.outcome !== "committed") return this.failed(input.orgRunId, result.outcome);
    }
    return Object.freeze({
      loaded: true,
      repaired: treeChanged || tasksChanged,
      state: validateAgentOrgStatePackage({
        executionTree: recoveredTree,
        taskRecords: recoveredTasks,
        communicationMessages: messages,
      }),
    });
  }

  private repairTree(
    tree: AgentOrgRunExecutionTreeSnapshot,
    repair: ReturnType<typeof repairTaskRecordsOnRootReopen>,
  ): AgentOrgRunExecutionTreeSnapshot {
    const tasks = (values: typeof tree.rootOrg.taskExecutions) => repairTaskExecutionForestOnRootReopen({
      tasks: values,
      referencedTaskRuns: repair.referencedTaskRuns,
      settledAtByRunId: repair.settledAtByRunId,
    });
    const members = tree.rootOrg.members.map((member): ConfiguredExecutionNode =>
      "agentRunId" in member ? member : Object.freeze({ ...member, taskExecutions: tasks(member.taskExecutions) }));
    return validateAgentOrgRunExecutionTreePayload({
      ...tree,
      rootOrg: { ...tree.rootOrg, members, taskExecutions: tasks(tree.rootOrg.taskExecutions) },
    }, tree.rootOrg.orgRunId);
  }

  private failed(orgRunId: string, outcome: string): AgentOrgStatePackageLoadResult {
    return { loaded: false, code: "AGENT_ORG_STATE_REPAIR_FAILED", message: `AgentOrg '${orgRunId}' repair did not commit (${outcome}).` };
  }
}
