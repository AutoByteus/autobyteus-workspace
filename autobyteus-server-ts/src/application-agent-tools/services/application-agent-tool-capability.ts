import type { ApplicationExecutionContext } from "@autobyteus/application-sdk-contracts";
import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import type {
  ApplicationAgentToolRoute,
  ApplicationAgentToolExecutionIdentity,
} from "../domain/application-agent-tool-route.js";
import { cloneApplicationAgentToolRoute } from "../domain/application-agent-tool-route.js";
import { ApplicationAgentToolError } from "../domain/application-agent-tool-errors.js";
import type { ApplicationAgentToolCatalog } from "./application-agent-tool-catalog.js";
import type { ApplicationAgentToolGateway } from "./application-agent-tool-gateway.js";
import type { ApplicationAgentToolResult } from "@autobyteus/application-sdk-contracts";

export type ResolveApplicationAgentToolRoutesInput = Readonly<{
  executionContext: ApplicationExecutionContext;
  sender: AgentRunMessageSenderContext;
  requestedToolNames: readonly string[];
}>;

export interface ApplicationAgentToolCapability {
  resolveSelectedRoutes(
    input: ResolveApplicationAgentToolRoutesInput,
  ): ReadonlyMap<string, ApplicationAgentToolRoute>;
  invoke(input: Readonly<{
    route: ApplicationAgentToolRoute;
    arguments: Record<string, unknown>;
  }>): Promise<ApplicationAgentToolResult>;
  close(): void;
}

export interface ApplicationAgentToolCapabilityAssembly {
  readonly capability: ApplicationAgentToolCapability;
  complete(gateway: ApplicationAgentToolGateway): ApplicationAgentToolCapability;
  abort(): void;
}

type AssemblyState = "ASSEMBLING" | "COMPLETED" | "ABORTED" | "CLOSED";

class SealedApplicationAgentToolCapability implements ApplicationAgentToolCapability {
  private gateway: ApplicationAgentToolGateway | null = null;
  private state: AssemblyState = "ASSEMBLING";

  constructor(private readonly catalog: ApplicationAgentToolCatalog) {}

  complete(gateway: ApplicationAgentToolGateway): void {
    if (this.state !== "ASSEMBLING") {
      throw new Error(`Application tool capability assembly is '${this.state.toLowerCase()}'.`);
    }
    this.gateway = gateway;
    this.state = "COMPLETED";
  }

  abort(): void {
    if (this.state !== "ASSEMBLING") return;
    this.state = "ABORTED";
  }

  resolveSelectedRoutes(
    input: ResolveApplicationAgentToolRoutesInput,
  ): ReadonlyMap<string, ApplicationAgentToolRoute> {
    this.assertReady();
    const identity = this.buildIdentity(input.executionContext, input.sender);
    const routes = new Map<string, ApplicationAgentToolRoute>();
    for (const toolName of [...new Set(input.requestedToolNames)]) {
      const snapshot = this.catalog.getDeclarationSnapshot(
        identity.applicationId,
        toolName,
      );
      if (!snapshot) continue;
      routes.set(toolName, Object.freeze({
        kind: "application_agent_tool",
        identity,
        declarationSnapshot: snapshot,
      }));
    }
    return routes;
  }

  invoke(input: Readonly<{
    route: ApplicationAgentToolRoute;
    arguments: Record<string, unknown>;
  }>): Promise<ApplicationAgentToolResult> {
    this.assertReady();
    return this.gateway!.invoke(cloneApplicationAgentToolRoute(input.route), input.arguments);
  }

  close(): void {
    if (this.state === "CLOSED") return;
    this.gateway = null;
    this.state = "CLOSED";
  }

  private assertReady(): void {
    if (this.state !== "COMPLETED" || !this.gateway) {
      throw new ApplicationAgentToolError(
        "APPLICATION_TOOL_UNAVAILABLE",
        "Application tool capability is unavailable.",
      );
    }
  }

  private buildIdentity(
    executionContext: ApplicationExecutionContext,
    sender: AgentRunMessageSenderContext,
  ): ApplicationAgentToolExecutionIdentity {
    if (
      !executionContext.applicationId?.trim()
      || !executionContext.bindingId?.trim()
      || executionContext.producer.agentRunId !== sender.senderRunId
    ) {
      throw new Error("Application tool execution identity is inconsistent.");
    }
    const memberIdentity = sender.memberTeamContext?.identity ?? null;
    if (memberIdentity && memberIdentity.agentRunId !== sender.senderRunId) {
      throw new Error("Application Team producer identity is inconsistent.");
    }
    return Object.freeze({
      applicationId: executionContext.applicationId,
      bindingId: executionContext.bindingId,
      producer: memberIdentity
        ? Object.freeze({ kind: "team_member" as const, ...memberIdentity })
        : Object.freeze({ kind: "agent" as const, agentRunId: sender.senderRunId }),
    });
  }
}

export const beginApplicationAgentToolCapabilityAssembly = (
  catalog: ApplicationAgentToolCatalog,
): ApplicationAgentToolCapabilityAssembly => {
  const capability = new SealedApplicationAgentToolCapability(catalog);
  return Object.freeze({
    capability,
    complete: (gateway: ApplicationAgentToolGateway) => {
      capability.complete(gateway);
      return capability;
    },
    abort: () => capability.abort(),
  });
};
