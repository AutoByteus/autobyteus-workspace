import { getAgentConversationActivityInspector } from "../../../agent-memory/services/agent-conversation-activity-inspector.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../run-history/services/team-run-execution-tree-location-service.js";
import type { RunOwnAgentsReader } from "../../../run-history/store/run-own-agents-reader.js";
import type { DelegationIndex } from "../../delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { RunAgentAccess } from "../remote/run-agent-access.js";
import type { RunOwnDelegations } from "./run-own-delegation.js";
import { createRunConversationAvailability, taskExecutionConversationUnavailable, type RunConversationAvailability } from "./run-conversation-availability.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import { runReferenceOf } from "./task-execution-resource-port.js";

/** Base's refusal of input that would restore a delegated run its entry agent's saved conversation cannot continue. */
export type DelegatedRunRestoreRefusal = Readonly<{ accepted: false; code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE"; message: string }>;

type Entry = Readonly<{ agentRunId: string; address: string }>;

/**
 * Whether input may restore a delegated run (autobyteus-461 CR-461-070, F-50): base checked a released copy before
 * restoring it (`assertRestorableChain`), from every entry, and refused with `TASK_EXECUTION_CONTEXT_UNAVAILABLE` naming
 * the run, its entry agent, the problem and the next step (`taskExecutionConversationUnavailable`). Asked where input
 * enters, before anything is restored: the user's message on the run's own stream (an agent run's, a team run's), and the
 * delegator's `send_message_to`; `delegate_task` by run ID asks the same builder (CR-461-043). A run whose entry agent is
 * live passes without a read. A run the user started (no delegation recorded) is not asked: it keeps its own text.
 */
export class DelegatedRunRestorability {
  constructor(private readonly dependencies: Readonly<{
    tree(): Pick<DelegationIndex, "tasksOf">;
    /** The run's own record of its delegation, for a run no Task names any more (its Task was deleted). */
    ownDelegations: Pick<RunOwnDelegations, "of">;
    conversationOf(execution: TaskExecutionReference, entry: Entry): Promise<RunConversationAvailability>;
  }>) {}

  async refusal(run: RootExecutionIdentity): Promise<DelegatedRunRestoreRefusal | null> {
    const execution = runReferenceOf(run);
    if (!execution) return null;
    const entry = await this.entryOf(execution);
    if (!entry) return null;
    const availability = await this.dependencies.conversationOf(execution, entry);
    if (availability.activity.kind === "present") return null;
    const refused = taskExecutionConversationUnavailable({ execution, address: entry.address, entryAddress: availability.entryAddress, activity: availability.activity });
    return Object.freeze({ accepted: false as const, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" as const, message: refused.message });
  }

  /** Its last Task entry's entry agent and address (a peer's run is not this node's to restore), else its own file's. */
  private async entryOf(execution: TaskExecutionReference): Promise<Entry | null> {
    const entries = this.dependencies.tree().tasksOf(execution);
    if (entries.some((entry) => entry.nodeId !== undefined)) return null;
    const last = [...entries].sort((a, b) => a.linkedAt.localeCompare(b.linkedAt)).at(-1);
    if (last) return { agentRunId: last.entryAgentRunId, address: last.recipientAddress };
    const own = await this.dependencies.ownDelegations.of(execution);
    return own ? { agentRunId: own.entryAgentRunId, address: own.recipientAddress } : null;
  }
}

/** The check as each entry builds it: its runs' liveness, and the runs' own files. */
export const createDelegatedRunRestorability = (input: Readonly<{
  memoryDir: string;
  tree: Pick<DelegationIndex, "tasksOf">;
  ownDelegations: Pick<RunOwnDelegations, "of">;
  liveAgents(kind: "agent" | "agent_team"): Pick<RunAgentAccess, "runAgentStatuses">;
}>): DelegatedRunRestorability => new DelegatedRunRestorability({
  tree: () => input.tree,
  ownDelegations: input.ownDelegations,
  conversationOf: createRunConversationAvailability({ memoryDir: input.memoryDir, inspector: getAgentConversationActivityInspector(),
    liveAgents: input.liveAgents, teamMembers: createStoredTeamRunExecutionTreeLocationService(input.memoryDir) }),
});

/** An agent run's own record of its delegation, from its own file (its address is stored there, contract §3.3). */
export const agentRunOwnDelegations = (files: Pick<RunOwnAgentsReader, "delegationOf">): Pick<RunOwnDelegations, "of"> => ({
  of: async (execution) => {
    if (!("agentRunId" in execution)) return null;
    const record = await files.delegationOf({ rootSubjectKind: "agent", rootRunId: execution.agentRunId });
    return record?.address ? { delegatedFrom: record.delegatedFrom, recipientAddress: record.address, entryAgentRunId: record.entryAgentRunId } : null;
  },
});
