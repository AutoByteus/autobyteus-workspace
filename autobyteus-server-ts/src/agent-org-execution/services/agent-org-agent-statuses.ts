import type { PairedAgentAccess, PairedAgentObservation, PairedAgentPresentationListener, PairedAgentStatus } from "../../agent-collaboration/execution/remote/paired-agent-access.js";
import type { AgentOrgRun } from "../domain/agent-org-run.js";

/**
 * An Org run's own agents' statuses, from its live root (autobyteus-461 SR-086 G-A4): what `RunStatusService` follows for
 * an Org run, as it follows a standalone run's host or a Team's members. Its agents' presentation frames while the Org
 * runs, and their current statuses; its registration's end makes them offline.
 */
export class AgentOrgAgentStatuses implements Pick<PairedAgentAccess, "observePairedAgents" | "pairedAgentStatuses"> {
  constructor(private readonly orgs: Readonly<{ getActive(orgRunId: string): AgentOrgRun | null }>) {}

  async observePairedAgents(orgRunId: string, onPresentation: PairedAgentPresentationListener): Promise<PairedAgentObservation | null> {
    const run = this.orgs.getActive(orgRunId);
    if (!run) return null;
    const unsubscribe = run.subscribeToEvents(({ event }) => {
      if (event.kind === "agent_presentation") onPresentation(event.execution.agentRunId, event.message);
    });
    return Object.freeze({ close: unsubscribe });
  }

  pairedAgentStatuses(orgRunId: string): readonly PairedAgentStatus[] {
    const run = this.orgs.getActive(orgRunId);
    return run ? run.getAgentStatusSnapshots().map((snapshot) => ({ agentRunId: snapshot.execution.agentRunId, status: snapshot.details.status,
      backgroundTasksRunning: snapshot.details.backgroundTasksRunning })) : [];
  }
}
