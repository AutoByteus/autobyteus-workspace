import type { ApplicationAgentToolResult } from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationAgentToolRoute,
} from "../domain/application-agent-tool-route.js";
import {
  ApplicationAgentToolError,
  applicationAgentToolSafeFailure,
} from "../domain/application-agent-tool-errors.js";
import type { ApplicationAvailabilityService } from "../../application-orchestration/services/application-availability-service.js";
import type { ApplicationRunOwnershipReader } from "../../application-orchestration/services/application-run-ownership-service.js";
import type { ApplicationAgentToolCatalog } from "./application-agent-tool-catalog.js";
import type { ApplicationAgentToolCallLifecycle } from "./application-agent-tool-call-lifecycle.js";
import type { ApplicationAgentToolPayloadValidator } from "./application-agent-tool-payload-validator.js";
import type { ApplicationAgentToolWorkerInvoker } from "./application-agent-tool-worker-invoker.js";

export class ApplicationAgentToolGateway {
  constructor(private readonly dependencies: Readonly<{
    availability: Pick<ApplicationAvailabilityService, "requireApplicationActive">;
    catalog: ApplicationAgentToolCatalog;
    ownership: ApplicationRunOwnershipReader;
    payloadValidator: ApplicationAgentToolPayloadValidator;
    lifecycle: ApplicationAgentToolCallLifecycle;
    workerInvoker: ApplicationAgentToolWorkerInvoker;
  }>) {}

  invoke(
    route: ApplicationAgentToolRoute,
    args: Record<string, unknown>,
  ): Promise<ApplicationAgentToolResult> {
    const applicationId = route.identity.applicationId;
    return this.dependencies.lifecycle.runAdmitted(applicationId, async () => {
      try {
        try {
          await this.dependencies.availability.requireApplicationActive(applicationId);
        } catch (error) {
          throw new ApplicationAgentToolError(
            "APPLICATION_TOOL_UNAVAILABLE",
            "Application tool execution is unavailable.",
            { cause: error },
          );
        }
        const current = this.dependencies.catalog.getDeclarationSnapshot(
          applicationId,
          route.declarationSnapshot.declaration.name,
        );
        if (!current || current.fingerprint !== route.declarationSnapshot.fingerprint) {
          throw new ApplicationAgentToolError(
            "APPLICATION_TOOL_STALE_ROUTE",
            "Application tool route is no longer current.",
          );
        }
        const caller = await this.dependencies.ownership
          .requireLiveApplicationToolProducer(route.identity);
        this.dependencies.payloadValidator.validateInput(current, args);
        const result = await this.dependencies.workerInvoker.invoke({
          applicationId,
          toolName: current.declaration.name,
          arguments: args,
          caller,
        });
        return this.dependencies.payloadValidator.validateResult(result);
      } catch (error) {
        if (error instanceof ApplicationAgentToolError) throw error;
        throw applicationAgentToolSafeFailure(error);
      }
    });
  }
}
