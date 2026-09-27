import { describe, expect, it } from "vitest";
import type { InitializeResponse } from "@agentclientprotocol/sdk";
import { grokBuildLaunchProfile } from "../../../../src/runtime-management/grok/grok-build-launch-profile.js";
import { readFixture } from "../../agent-execution/backends/acp/acp-fake-agent-harness.js";

const initializeResult = (): InitializeResponse =>
  readFixture("handshake").find((row) => row.dir === "in" && row.msg.result?.agentCapabilities)!.msg.result as InitializeResponse;

describe("grokBuildLaunchProfile", () => {
  it("launches one non-leader ACP stdio agent with the selected model and effort", () => {
    expect(grokBuildLaunchProfile.args({ model: "grok-4.7", reasoningEffort: "high" }))
      .toEqual(["agent", "--no-leader", "--model", "grok-4.7", "--reasoning-effort", "high", "stdio"]);
    expect(grokBuildLaunchProfile.args({ model: null, reasoningEffort: null })).toEqual(["agent", "--no-leader", "stdio"]);
  });

  it("disables task subagents, workflows and ask_user_question per process without touching the base env (AC-013)", () => {
    const base = { PATH: "/bin", XAI_API_KEY: "user-key" };
    expect(grokBuildLaunchProfile.env(base)).toEqual({
      PATH: "/bin", XAI_API_KEY: "user-key", GROK_SUBAGENTS: "0", GROK_WORKFLOWS: "0", GROK_ASK_USER_QUESTION: "0",
    });
    expect(base).toEqual({ PATH: "/bin", XAI_API_KEY: "user-key" });
  });

  it("offers the agent-reported models with context capacity and the reasoning-effort schema (AC-002)", () => {
    expect(grokBuildLaunchProfile.normalizeModels(initializeResult())).toEqual([expect.objectContaining({
      model_identifier: "grok-4.7", display_name: "Grok 4.7", provider_type: "GROK", provider_name: "Grok Build",
      max_context_tokens: 500000,
      config_schema: expect.objectContaining({ properties: { reasoning_effort: expect.objectContaining({
        enum: ["xhigh", "high", "medium", "low"], default: "high" }) } }),
    })]);
  });

  it("returns no models for a malformed catalog", () => {
    expect(grokBuildLaunchProfile.normalizeModels({ protocolVersion: 1, _meta: { modelState: { availableModels: [{ modelId: "bad id!" }, "x"] } } } as never)).toEqual([]);
    expect(grokBuildLaunchProfile.normalizeModels({ protocolVersion: 1 } as never)).toEqual([]);
  });
});
