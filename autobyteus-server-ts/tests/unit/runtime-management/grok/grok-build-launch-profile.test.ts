import { afterEach, describe, expect, it, vi } from "vitest";
import type { InitializeResponse } from "@agentclientprotocol/sdk";
import {
  grokBuildLaunchProfile,
  normalizeGrokBuildModels,
} from "../../../../src/runtime-management/grok/grok-build-launch-profile.js";
import type { AcpRunLaunchRequest } from "../../../../src/runtime-management/acp/acp-agent-launch-profile.js";
import { readFixture } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

const initializeResult = (): InitializeResponse =>
  readFixture("handshake").find((row) => row.dir === "in" && row.msg.result?.agentCapabilities)!.msg.result as InitializeResponse;

const runRequest = (overrides: Partial<AcpRunLaunchRequest> = {}): AcpRunLaunchRequest => ({
  runId: "run-1", workingDirectory: "/tmp/ws", instructions: "Be helpful.", model: "grok-4.7", reasoningEffort: "high",
  relayAccess: null, ...overrides,
});

afterEach(() => { vi.unstubAllEnvs(); });

describe("grokBuildLaunchProfile", () => {
  it("launches one non-leader ACP stdio agent with the selected model and effort, and needs no relay", async () => {
    expect(grokBuildLaunchProfile.providerRelayId).toBeNull();
    expect((await grokBuildLaunchProfile.runLaunch(runRequest())).args)
      .toEqual(["agent", "--no-leader", "--model", "grok-4.7", "--reasoning-effort", "high", "stdio"]);
    expect((await grokBuildLaunchProfile.runLaunch(runRequest({ model: null, reasoningEffort: null }))).args)
      .toEqual(["agent", "--no-leader", "stdio"]);
    expect((await grokBuildLaunchProfile.discoveryLaunch({ relayBaseUrl: null })).args).toEqual(["agent", "--no-leader", "stdio"]);
  });

  it("disables task subagents, workflows and ask_user_question per process without touching the server env (AC-013)", async () => {
    vi.stubEnv("XAI_API_KEY", "user-key");
    const launch = await grokBuildLaunchProfile.runLaunch(runRequest());
    expect(launch.env).toMatchObject({
      XAI_API_KEY: "user-key", GROK_SUBAGENTS: "0", GROK_WORKFLOWS: "0", GROK_ASK_USER_QUESTION: "0",
    });
    expect(process.env.GROK_SUBAGENTS).toBeUndefined();
    await expect(launch.release()).resolves.toBeUndefined();
  });

  it("offers the agent-reported models with context capacity and the reasoning-effort schema (AC-002)", () => {
    expect(normalizeGrokBuildModels(initializeResult())).toEqual([expect.objectContaining({
      model_identifier: "grok-4.7", display_name: "Grok 4.7", provider_type: "GROK", provider_name: "Grok Build",
      max_context_tokens: 500000,
      config_schema: expect.objectContaining({ properties: { reasoning_effort: expect.objectContaining({
        enum: ["xhigh", "high", "medium", "low"], default: "high" }) } }),
    })]);
  });

  it("returns no models for a malformed catalog", () => {
    expect(normalizeGrokBuildModels({ protocolVersion: 1, _meta: { modelState: { availableModels: [{ modelId: "bad id!" }, "x"] } } } as never)).toEqual([]);
    expect(normalizeGrokBuildModels({ protocolVersion: 1 } as never)).toEqual([]);
  });
});
