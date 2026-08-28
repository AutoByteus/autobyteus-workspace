import type {
  ApplicationAgentToolCaller,
  ApplicationAgentToolResult,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationEngineController } from "../../application-engine/services/application-engine-controller.js";
import type { ApplicationEngineLauncher } from "../../application-engine/services/application-engine-launcher.js";
import { ApplicationAgentToolError } from "../domain/application-agent-tool-errors.js";

export type ApplicationAgentToolWorkerCommand = Readonly<{
  applicationId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  caller: ApplicationAgentToolCaller;
}>;

export class ApplicationAgentToolWorkerInvoker {
  constructor(private readonly dependencies: Readonly<{
    controller: Pick<ApplicationEngineController, "getStatus" | "invokeApplicationAgentTool">;
    launcher: Pick<ApplicationEngineLauncher, "ensureReady">;
  }>) {}

  async invoke(command: ApplicationAgentToolWorkerCommand): Promise<ApplicationAgentToolResult> {
    const status = this.dependencies.controller.getStatus(command.applicationId);
    if (status.state === "failed" || status.state === "stopping") {
      throw new ApplicationAgentToolError(
        "APPLICATION_TOOL_UNAVAILABLE",
        "Application tool worker is unavailable.",
      );
    }
    if (status.state !== "ready") {
      if (!["stopped", "preparing_storage", "starting_worker"].includes(status.state)) {
        throw new ApplicationAgentToolError(
          "APPLICATION_TOOL_UNAVAILABLE",
          "Application tool worker is unavailable.",
        );
      }
      await this.dependencies.launcher.ensureReady(command.applicationId);
    }
    try {
      return await this.dependencies.controller.invokeApplicationAgentTool(
        command.applicationId,
        {
          toolName: command.toolName,
          arguments: command.arguments,
          caller: command.caller,
        },
      );
    } catch (error) {
      throw new ApplicationAgentToolError(
        "APPLICATION_TOOL_EXECUTION_FAILED",
        "Application tool execution failed.",
        { cause: error },
      );
    }
  }
}
