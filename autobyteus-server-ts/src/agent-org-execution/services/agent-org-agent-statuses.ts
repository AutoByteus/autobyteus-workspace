import type { RunAgentAccess, RunAgentObservation, RunAgentPresentationListener, RunAgentStatusEntry } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import type { AgentOrgRun } from "../domain/agent-org-run.js";

/**
 * An Org run's own agents' statuses, from its live root (autobyteus-461 SR-086 G-A4): what `RunStatusService` follows for
 * an Org run, as it follows a standalone run's host or a Team's members. Its agents' presentation frames while the Org
 * runs, and their current statuses; its registration's end makes them offline.
 */
export class AgentOrgAgentStatuses implements Pick<RunAgentAccess, "observeRunAgents" | "runAgentStatuses"> {
  constructor(private readonly orgs: Readonly<{ getActive(orgRunId: string): AgentOrgRun | null }>) {}

  async observeRunAgents(orgRunId: string, onPresentation: RunAgentPresentationListener): Promise<RunAgentObservation | null> {
    const run = this.orgs.getActive(orgRunId);
    if (!run) return null;
    const unsubscribe = run.subscribeToEvents(({ event }) => {
      if (event.kind === "agent_presentation") onPresentation(event.execution.agentRunId, event.message);
    });
    return Object.freeze({ close: unsubscribe });
  }

  runAgentStatuses(orgRunId: string): readonly RunAgentStatusEntry[] {
    const run = this.orgs.getActive(orgRunId);
    return run ? run.getAgentStatusSnapshots().map((snapshot) => ({ agentRunId: snapshot.execution.agentRunId, status: snapshot.details.status,
      backgroundTasksRunning: snapshot.details.backgroundTasksRunning })) : [];
  }
}
