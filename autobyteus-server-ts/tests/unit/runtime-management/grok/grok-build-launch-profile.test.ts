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
const modelState = (): unknown => (initializeResult()._meta as Record<string, unknown>).modelState;

const runRequest = (overrides: Partial<AcpRunLaunchRequest> = {}): AcpRunLaunchRequest => ({
  runId: "run-1", workingDirectory: "/tmp/ws", instructions: "Be helpful.", model: "grok-4.7", reasoningEffort: "high",
  relayAccess: null, ...overrides,
});

afterEach(() => { vi.unstubAllEnvs(); });

describe("grokBuildLaunchProfile", () => {
  it("launches one non-leader ACP stdio agent with the selected model and effort, relayed only on a relayed node", async () => {
    expect(grokBuildLaunchProfile.relay).toEqual({ relayId: "xai", runtimeKind: "grok_build", use: "whenRelayed" });
    expect((await grokBuildLaunchProfile.runLaunch(runRequest())).args)
      .toEqual(["agent", "--no-leader", "--model", "grok-4.7", "--reasoning-effort", "high", "stdio"]);
    expect((await grokBuildLaunchProfile.runLaunch(runRequest({ model: null, reasoningEffort: null }))).args)
      .toEqual(["agent", "--no-leader", "stdio"]);
    expect((await grokBuildLaunchProfile.discoveryLaunch({ relayBaseUrl: null, nodeRelayAccess: null })).args).toEqual(["agent", "--no-leader", "stdio"]);
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

  // autobyteus-581 P-7 / U-2: on a relayed node xAI's address is the relay and the pass travels by kind; the node's own
  // xAI credentials never reach Grok.
  it("on a relayed node points Grok at the xAI relay with the pass in the variable of its relay credential kind", async () => {
    vi.stubEnv("XAI_API_KEY", "user-key");
    vi.stubEnv("GROK_AUTH_PROVIDER_ACCESS_TOKEN", "user-token");
    const relay = { baseUrl: "http://127.0.0.1:5000/relay/xai", pass: "rp_pass", relayCredentialKind: "apiKey" as const };
    const apiKey = await grokBuildLaunchProfile.runLaunch(runRequest({ relayAccess: relay }));
    expect(apiKey.env).toMatchObject({ GROK_XAI_API_BASE_URL: "http://127.0.0.1:5000/relay/xai/v1", XAI_API_KEY: "rp_pass" });
    expect(apiKey.env.GROK_AUTH_PROVIDER_ACCESS_TOKEN).toBeUndefined();
    const login = await grokBuildLaunchProfile.runLaunch(runRequest({ relayAccess: { ...relay, relayCredentialKind: "loginToken" } }));
    expect(login.env).toMatchObject({ GROK_XAI_API_BASE_URL: "http://127.0.0.1:5000/relay/xai/v1", GROK_AUTH_PROVIDER_ACCESS_TOKEN: "rp_pass" });
    expect(login.env.XAI_API_KEY).toBeUndefined();
    const discovery = await grokBuildLaunchProfile.discoveryLaunch({ relayBaseUrl: null, nodeRelayAccess: relay });
    expect(discovery.env).toMatchObject({ GROK_XAI_API_BASE_URL: "http://127.0.0.1:5000/relay/xai/v1", XAI_API_KEY: "rp_pass" });
  });

  // autobyteus-551 REQ-003 / QR-002: a run's Grok trusts its workspace for this process alone, so it loads the
  // workspace's own `.grok/skills`; discovery processes (models, billing) stay untrusted; `--trust`, which would save
  // the folder in the user's Grok settings, is never passed.
  it("trusts the run workspace per process with GROK_FOLDER_TRUST=0 in run launches only, never with --trust", async () => {
    const run = await grokBuildLaunchProfile.runLaunch(runRequest());
    const discovery = await grokBuildLaunchProfile.discoveryLaunch({ relayBaseUrl: null, nodeRelayAccess: null });
    expect(run.env.GROK_FOLDER_TRUST).toBe("0");
    expect(discovery.env.GROK_FOLDER_TRUST).toBeUndefined();
    expect(discovery.env).toMatchObject({ GROK_SUBAGENTS: "0", GROK_WORKFLOWS: "0", GROK_ASK_USER_QUESTION: "0" });
    expect([...run.args, ...discovery.args].some((arg) => arg.startsWith("--trust"))).toBe(false);
    expect(process.env.GROK_FOLDER_TRUST).toBeUndefined();
  });

  it("offers the agent-reported models with context capacity and the reasoning-effort schema (AC-002)", () => {
    expect(normalizeGrokBuildModels(modelState())).toEqual([expect.objectContaining({
      model_identifier: "grok-4.7", display_name: "Grok 4.7", provider_type: "GROK", provider_name: "Grok Build",
      max_context_tokens: 500000,
      config_schema: expect.objectContaining({ properties: { reasoning_effort: expect.objectContaining({
        enum: ["xhigh", "high", "medium", "low"], default: "high" }) } }),
    })]);
  });

  // autobyteus-551: Grok's `_x.ai/models/update` params have the shape of `initialize._meta.modelState` (P16).
  it("reads the same model state shape from Grok's models announcement", () => {
    expect(normalizeGrokBuildModels({ currentModelId: "grok-4.7", availableModels: [
      { modelId: "grok-4.7", name: "Grok 4.7", _meta: { totalContextTokens: 500000 } },
    ] }).map((model) => [model.model_identifier, model.max_context_tokens])).toEqual([["grok-4.7", 500000]]);
  });

  it("returns no models for a malformed catalog", () => {
    expect(normalizeGrokBuildModels({ availableModels: [{ modelId: "bad id!" }, "x"] })).toEqual([]);
    expect(normalizeGrokBuildModels(undefined)).toEqual([]);
    expect(normalizeGrokBuildModels({ availableModels: "grok-4.7" })).toEqual([]);
  });
});
