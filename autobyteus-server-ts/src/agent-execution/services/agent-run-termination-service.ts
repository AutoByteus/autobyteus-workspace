import { AgentRunManager } from "./agent-run-manager.js";
import { getRunHistoryService, type RunHistoryService } from "../../run-history/services/run-history-service.js";
import {
  getRuntimeCommandIngressService,
  type RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import {
  getRuntimeCompositionService,
  type RuntimeCompositionService,
} from "../../runtime-execution/runtime-composition-service.js";
import { DEFAULT_RUNTIME_KIND, type RuntimeKind } from "../../runtime-management/runtime-kind.js";

export type AgentRunTerminationRoute = "native" | "runtime" | "not_found";

export interface AgentRunTerminationResult {
  success: boolean;
  message: string;
  route: AgentRunTerminationRoute;
  runtimeKind: RuntimeKind | null;
}

export class AgentRunTerminationService {
  private agentRunManager: AgentRunManager;
  private runtimeCompositionService: RuntimeCompositionService;
  private runtimeCommandIngressService: RuntimeCommandIngressService;
  private runHistoryService: RunHistoryService;

  constructor(
    agentRunManager: AgentRunManager = AgentRunManager.getInstance(),
    runtimeCompositionService: RuntimeCompositionService = getRuntimeCompositionService(),
    runtimeCommandIngressService: RuntimeCommandIngressService = getRuntimeCommandIngressService(),
    runHistoryService: RunHistoryService = getRunHistoryService(),
  ) {
    this.agentRunManager = agentRunManager;
    this.runtimeCompositionService = runtimeCompositionService;
    this.runtimeCommandIngressService = runtimeCommandIngressService;
    this.runHistoryService = runHistoryService;
  }

  async terminateAgentRun(runId: string): Promise<AgentRunTerminationResult> {
    const runtimeSession = this.runtimeCompositionService.getRunSession(runId);
    if (runtimeSession && runtimeSession.runtimeKind !== DEFAULT_RUNTIME_KIND) {
      const result = await this.runtimeCommandIngressService.terminateRun({
        runId,
        mode: "agent",
      });
      if (!result.accepted) {
        return this.notFound(runtimeSession.runtimeKind);
      }

      await this.finalizeSuccess(runId);
      return {
        success: true,
        message: "Agent run terminated successfully.",
        route: "runtime",
        runtimeKind: runtimeSession.runtimeKind,
      };
    }

    const nativeAgent = this.agentRunManager.getAgentRun(runId);
    const shouldUseNative = Boolean(nativeAgent) || runtimeSession?.runtimeKind === DEFAULT_RUNTIME_KIND;
    if (!shouldUseNative) {
      return this.notFound(null);
    }

    const success = await this.agentRunManager.terminateAgentRun(runId);
    if (!success) {
      return this.notFound(runtimeSession?.runtimeKind ?? DEFAULT_RUNTIME_KIND);
    }

    await this.finalizeSuccess(runId);
    return {
      success: true,
      message: "Agent run terminated successfully.",
      route: "native",
      runtimeKind: runtimeSession?.runtimeKind ?? DEFAULT_RUNTIME_KIND,
    };
  }

  private async finalizeSuccess(runId: string): Promise<void> {
    this.runtimeCompositionService.removeRunSession(runId);
    await this.runHistoryService.onRunTerminated(runId);
  }

  private notFound(runtimeKind: RuntimeKind | null): AgentRunTerminationResult {
    return {
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind,
    };
  }
}

let cachedAgentRunTerminationService: AgentRunTerminationService | null = null;

export const getAgentRunTerminationService = (): AgentRunTerminationService => {
  if (!cachedAgentRunTerminationService) {
    cachedAgentRunTerminationService = new AgentRunTerminationService();
  }
  return cachedAgentRunTerminationService;
};
