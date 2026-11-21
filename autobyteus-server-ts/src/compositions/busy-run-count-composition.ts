import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { finalizeBusyRuns, inspectBusyAgentRuns } from "../agent-execution/services/busy-runs.js";
import type { ApplicationPlatformHostManagementContracts } from "../application-platform/runtime/application-platform-runtime-contracts.js";

export function composeBusyRunCount(application: Pick<ApplicationPlatformHostManagementContracts["activeAgentRuns"], "inspectBusy" | "finalizeBusy">,
  processRuns: () => Pick<AgentRunManager, "listActiveRuns" | "getActiveRun"> = () => AgentRunManager.getInstance()) {
  return async () => {
    const manager = processRuns();
    const [processInspection, applicationInspection] = await Promise.all([inspectBusyAgentRuns(manager), application.inspectBusy()]);
    const p = finalizeBusyRuns(manager, processInspection);
    const a = application.finalizeBusy(applicationInspection);
    return { busy: p.busy + a.busy, unknown: p.unknown + a.unknown };
  };
}
