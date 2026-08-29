import { describe, expect, it, vi } from "vitest";
import { ApplicationAgentToolCatalog } from "../../../src/application-agent-tools/services/application-agent-tool-catalog.js";
import { ApplicationAgentToolCallLifecycle } from "../../../src/application-agent-tools/services/application-agent-tool-call-lifecycle.js";
import { ApplicationAgentToolGateway } from "../../../src/application-agent-tools/services/application-agent-tool-gateway.js";
import { ApplicationAgentToolPayloadValidator } from "../../../src/application-agent-tools/services/application-agent-tool-payload-validator.js";

const APPLICATION_ID = "app-a";
const TOOL_NAME = "gateway_probe";
const declaration = (description = "Gateway probe") => ({
  name: TOOL_NAME,
  description,
  inputSchema: {
    type: "object" as const,
    properties: { value: { type: "string" as const, description: "Value." } },
    required: ["value"],
  },
});

const buildHarness = () => {
  const catalog = new ApplicationAgentToolCatalog();
  catalog.initializeFromBundleSnapshot({
    applications: [{ id: APPLICATION_ID, agentTools: [declaration()] }],
    diagnostics: [],
    refreshedAt: "2026-08-27T00:00:00.000Z",
  } as never);
  const lifecycle = new ApplicationAgentToolCallLifecycle();
  lifecycle.open(APPLICATION_ID);
  const availability = vi.fn(async () => undefined);
  const ownership = vi.fn(async () => ({
    applicationId: APPLICATION_ID,
    bindingId: "binding-a",
    agentRunId: "run-a",
  }));
  const workerInvoke = vi.fn(async () => ({
    content: [{ type: "text" as const, text: "ok" }],
  }));
  const gateway = new ApplicationAgentToolGateway({
    availability: { requireApplicationActive: availability } as never,
    catalog,
    ownership: {
      requireLiveApplicationToolProducer: ownership,
      hasLiveRunOwnership: vi.fn(async () => true),
    },
    payloadValidator: new ApplicationAgentToolPayloadValidator(),
    lifecycle,
    workerInvoker: { invoke: workerInvoke } as never,
  });
  const snapshot = catalog.getDeclarationSnapshot(APPLICATION_ID, TOOL_NAME)!;
  const route = {
    kind: "application_agent_tool" as const,
    identity: {
      applicationId: APPLICATION_ID,
      bindingId: "binding-a",
      producer: { kind: "agent" as const, agentRunId: "run-a" },
    },
    declarationSnapshot: snapshot,
  };
  return { catalog, lifecycle, availability, ownership, workerInvoke, gateway, route };
};

describe("ApplicationAgentToolGateway validation, stale-route, and failure behavior", () => {
  it("rejects a stale fingerprint before ownership or worker dispatch", async () => {
    const harness = buildHarness();
    const delta = harness.catalog.prepareDelta({
      applications: [{ id: APPLICATION_ID, agentTools: [declaration("Changed declaration")] }],
    } as never);
    harness.catalog.commitPreparedDelta(delta);

    await expect(harness.gateway.invoke(harness.route, { value: "old" }))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_STALE_ROUTE" });
    expect(harness.availability).toHaveBeenCalledTimes(1);
    expect(harness.ownership).not.toHaveBeenCalled();
    expect(harness.workerInvoke).not.toHaveBeenCalled();
  });

  it("rejects invalid and oversized raw inputs without worker dispatch", async () => {
    const harness = buildHarness();

    await expect(harness.gateway.invoke(harness.route, { value: 3 } as never))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_INVALID_INPUT" });
    await expect(harness.gateway.invoke(harness.route, { value: "x".repeat(1024 * 1024) }))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_INVALID_INPUT" });
    expect(harness.workerInvoke).not.toHaveBeenCalled();
  });

  it("accepts all result forms while returning a defensive clone", async () => {
    const harness = buildHarness();
    const result = {
      content: [
        { type: "text" as const, text: "failed by application" },
        { type: "image" as const, data: "aW1hZ2U=", mimeType: "image/png" },
        { type: "audio" as const, data: "YXVkaW8=", mimeType: "audio/wav" },
        { type: "resource" as const, resource: { uri: "app://record/1", text: "record" } },
        { type: "resource_link" as const, name: "record", uri: "app://record/1", size: 6 },
      ],
      structuredContent: { reason: "expected" },
      isError: true,
    };
    harness.workerInvoke.mockResolvedValue(result);

    const received = await harness.gateway.invoke(harness.route, { value: "alpha" });
    expect(received).toEqual(result);
    expect(received).not.toBe(result);
    expect(received.content).not.toBe(result.content);
  });

  it("rejects an oversized worker result and invokes the worker exactly once", async () => {
    const harness = buildHarness();
    harness.workerInvoke.mockResolvedValue({
      content: [{ type: "text", text: "x".repeat(1024 * 1024) }],
    });

    await expect(harness.gateway.invoke(harness.route, { value: "alpha" }))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_INVALID_RESULT" });
    expect(harness.workerInvoke).toHaveBeenCalledTimes(1);
  });

  it("sanitizes an unexpected worker failure and never retries", async () => {
    const harness = buildHarness();
    harness.workerInvoke.mockRejectedValue(new Error("secret provider detail"));

    await expect(harness.gateway.invoke(harness.route, { value: "alpha" }))
      .rejects.toMatchObject({
        code: "APPLICATION_TOOL_EXECUTION_FAILED",
        message: "Application tool execution failed.",
      });
    expect(harness.workerInvoke).toHaveBeenCalledTimes(1);
  });
});
