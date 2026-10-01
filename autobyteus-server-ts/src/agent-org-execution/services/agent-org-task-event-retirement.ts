import {
  sameCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationAgentExecutionEvent } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";

/**
 * Suppresses the teardown status events of agents whose task execution is being shut down
 * quietly, from the committed shutdown until its release.
 */
export class AgentOrgTaskEventRetirement {
  private readonly retiring = new Map<string, CollaborationMemberExecutionIdentity>();

  constructor(private readonly options: Readonly<{
    getIndex(): AgentOrgExecutionIndex;
    identityFor(agentRunId: string, address: string): CollaborationMemberExecutionIdentity;
  }>) {}

  begin(reference: TaskExecutionReference): () => void {
    const index = this.options.getIndex();
    const execution = index.getTaskExecution(reference);
    if (!execution) throw new Error("Task execution event retirement target is not live in this AgentOrg.");
    const agents = execution.kind === "agent"
      ? [index.requireAgent(execution.agentRunId)]
      : index.listAgents().filter((agent) => agent.host.hostKind === "team"
        && index.listTeamAncestorsDeepestFirst(agent.host.hostRunId)
          .some((team) => team.teamRunId === execution.teamRunId));
    const retired = agents.map((agent) => this.options.identityFor(agent.agentRunId, agent.address));
    for (const identity of retired) {
      const current = this.retiring.get(identity.agentRunId);
      if (current && !sameCollaborationMemberExecutionIdentity(current, identity)) {
        throw new Error(`AgentRun '${identity.agentRunId}' already has a different event-retirement identity.`);
      }
      this.retiring.set(identity.agentRunId, identity);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const identity of retired) {
        const current = this.retiring.get(identity.agentRunId);
        if (current && sameCollaborationMemberExecutionIdentity(current, identity)) this.retiring.delete(identity.agentRunId);
      }
    };
  }

  isCommittedTeardownStatus(identity: CollaborationMemberExecutionIdentity, event: CollaborationAgentExecutionEvent): boolean {
    const retired = this.retiring.get(identity.agentRunId);
    return event.kind === "agent_run"
      && event.event.eventType === "AGENT_STATUS"
      && Boolean(retired && sameCollaborationMemberExecutionIdentity(retired, identity));
  }
}
