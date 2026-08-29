import { describe, expect, it, vi } from "vitest";
import type { ToolExecutionOptions, ToolResultExecutionMode } from "autobyteus-ts/tools/base-tool.js";
import { buildAgentRunMessageSenderContext } from "../../../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { ApplicationAgentToolCatalog } from "../../../../../../src/application-agent-tools/services/application-agent-tool-catalog.js";
import { beginApplicationAgentToolCapabilityAssembly } from "../../../../../../src/application-agent-tools/services/application-agent-tool-capability.js";
import { ApplicationAgentToolCallLifecycle } from "../../../../../../src/application-agent-tools/services/application-agent-tool-call-lifecycle.js";
import { ApplicationAgentToolGateway } from "../../../../../../src/application-agent-tools/services/application-agent-tool-gateway.js";
import { ApplicationAgentToolPayloadValidator } from "../../../../../../src/application-agent-tools/services/application-agent-tool-payload-validator.js";
import { ApplicationAgentToolNativeSchemaProjector } from "../../../../../../src/agent-execution/backends/autobyteus/application-agent-tools/application-agent-tool-native-schema-projector.js";
import { ApplicationAgentTool } from "../../../../../../src/agent-execution/backends/autobyteus/application-agent-tools/application-agent-tool.js";

const APPLICATION_ID = "app-a";
const RUN_ID = "run-a";
const declaration = {
  name: "validate_types",
  description: "Validate raw provider argument types.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: { type: "integer" as const, description: "Limit." },
      ratio: { type: "number" as const, description: "Ratio." },
      enabled: { type: "boolean" as const, description: "Enabled." },
      items: {
        type: "array" as const,
        description: "Items.",
        items: { type: "string" as const, description: "Item." },
      },
      filters: {
        type: "object" as const,
        description: "Filters.",
        properties: {
          nestedLimit: { type: "integer" as const, description: "Nested limit." },
        },
        required: ["nestedLimit"],
      },
    },
    required: ["limit", "ratio", "enabled", "items", "filters"],
  },
};

const buildTool = () => {
  const catalog = new ApplicationAgentToolCatalog();
  catalog.initializeFromBundleSnapshot({
    applications: [{ id: APPLICATION_ID, agentTools: [declaration] }],
    diagnostics: [],
    refreshedAt: "2026-08-27T00:00:00.000Z",
  } as never);
  const lifecycle = new ApplicationAgentToolCallLifecycle();
  lifecycle.open(APPLICATION_ID);
  const workerInvoke = vi.fn(async (command: any) => ({
    content: [{ type: "text" as const, text: "accepted" }],
    structuredContent: { arguments: command.arguments },
  }));
  const gateway = new ApplicationAgentToolGateway({
    availability: { requireApplicationActive: vi.fn(async () => undefined) } as never,
    catalog,
    ownership: {
      requireLiveApplicationToolProducer: vi.fn(async () => ({
        applicationId: APPLICATION_ID,
        bindingId: "binding-a",
        agentRunId: RUN_ID,
        memberAddress: null,
      })),
    },
    payloadValidator: new ApplicationAgentToolPayloadValidator(),
    lifecycle,
    workerInvoker: { invoke: workerInvoke } as never,
  });
  const assembly = beginApplicationAgentToolCapabilityAssembly(catalog);
  const capability = assembly.complete(gateway);
  const routes = capability.resolveSelectedRoutes({
    executionContext: {
      applicationId: APPLICATION_ID,
      bindingId: "binding-a",
      producer: { agentRunId: RUN_ID, displayName: "Agent A" },
    },
    sender: buildAgentRunMessageSenderContext({
      senderRunId: RUN_ID,
      senderName: "Agent A",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    }),
    requestedToolNames: [declaration.name],
  });
  const route = routes.get(declaration.name)!;
  const schema = new ApplicationAgentToolNativeSchemaProjector().project(declaration.inputSchema);
  return {
    capability,
    workerInvoke,
    tool: new ApplicationAgentTool(route, capability, schema),
    route,
    schema,
  };
};

describe("AutoByteus ApplicationAgentTool raw preparation and common validation", () => {
  it("returns the identical raw object, binds agent id, keeps in-process mode, and executes without a second transformation", async () => {
    const { tool, workerInvoke, capability } = buildTool();
    const args = {
      limit: 3,
      ratio: 3.5,
      enabled: true,
      items: [],
      filters: { nestedLimit: 2 },
    };

    const prepared = await tool.prepareExecution({ agentId: "native-agent" } as never, args);
    expect(prepared.args).toBe(args);
    expect(prepared.resultExecutionMode).toBe("in_process");
    expect((tool as unknown as { agentId: string }).agentId).toBe("native-agent");

    await expect(tool.execute({ agentId: "native-agent" } as never, args)).resolves.toMatchObject({
      content: [{ type: "text", text: "accepted" }],
    });
    expect(workerInvoke).toHaveBeenCalledTimes(1);
    expect(workerInvoke.mock.calls[0]![0].arguments).toBe(args);
    capability.close();
  });

  it.each([
    ["integer string", { limit: "3", ratio: 3.5, enabled: true, items: [], filters: { nestedLimit: 2 } }],
    ["number string", { limit: 3, ratio: "3.5", enabled: true, items: [], filters: { nestedLimit: 2 } }],
    ["boolean alias", { limit: 3, ratio: 3.5, enabled: "yes", items: [], filters: { nestedLimit: 2 } }],
    ["empty-string array", { limit: 3, ratio: 3.5, enabled: true, items: "", filters: { nestedLimit: 2 } }],
    ["nested integer string", { limit: 3, ratio: 3.5, enabled: true, items: [], filters: { nestedLimit: "2" } }],
  ])("rejects raw %s before any worker invocation", async (_label, args) => {
    const { tool, workerInvoke, capability } = buildTool();
    const prepared = await tool.prepareExecution({ agentId: "native-agent" } as never, args as never);
    expect(prepared.args).toBe(args);

    await expect(tool.execute({ agentId: "native-agent" } as never, args as never))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_INVALID_INPUT" });
    expect(workerInvoke).not.toHaveBeenCalled();
    capability.close();
  });

  it("rejects an already-aborted preparation before invoking the capability", async () => {
    const { tool, workerInvoke, capability } = buildTool();
    const controller = new AbortController();
    controller.abort();

    await expect(tool.prepareExecution(
      { agentId: "native-agent" } as never,
      {} as never,
      { signal: controller.signal },
    )).rejects.toThrow("execution aborted before start");
    expect(workerInvoke).not.toHaveBeenCalled();
    capability.close();
  });

  it("rejects an invalid result-execution mode at the application adapter boundary", async () => {
    const { capability, route, schema, workerInvoke } = buildTool();
    class InvalidModeApplicationAgentTool extends ApplicationAgentTool {
      protected override getToolResultExecutionMode(
        _context: unknown,
        _args: Record<string, unknown>,
        _options: ToolExecutionOptions,
      ): ToolResultExecutionMode {
        return "invalid" as ToolResultExecutionMode;
      }
    }
    const tool = new InvalidModeApplicationAgentTool(route, capability, schema);

    await expect(tool.prepareExecution({ agentId: "native-agent" } as never, {}))
      .rejects.toThrow("Invalid tool result execution mode");
    expect(workerInvoke).not.toHaveBeenCalled();
    capability.close();
  });
});
