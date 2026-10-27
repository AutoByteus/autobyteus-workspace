import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MODEL_ROUTER_LLM_CONFIG_SETTING_KEY,
  MODEL_ROUTER_MODEL_SETTING_KEY,
  MODEL_ROUTER_RUNTIME_SETTING_KEY,
  ModelRoutingSettings,
  normalizeModelRouterLlmConfigForPersistence,
  readModelRouterLaunch,
} from "../../../src/model-routing/model-routing-settings.js";
import type { RunModelSelectionValidationResult } from "../../../src/llm-management/services/run-model-selection-service.js";

/** autobyteus-313 REQ-002, REQ-005: the router's launch configuration is runtime, model and model settings. */
afterEach(() => { vi.restoreAllMocks(); });

describe("readModelRouterLaunch", () => {
  it("REQ-005: settings written before the model-settings key (beta.11: runtime and model only) read as no settings", () => {
    expect(readModelRouterLaunch("codex_app_server", "gpt-sol", undefined)).toEqual({ runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", llmConfig: null });
    expect(readModelRouterLaunch("codex_app_server", "gpt-sol", "  ")).toMatchObject({ llmConfig: null });
  });

  it("reads the stored model settings; not set until runtime and model are both set", () => {
    expect(readModelRouterLaunch("claude_agent_sdk", "claude-sonnet-5-5", '{"thinking_level":"high"}'))
      .toEqual({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "claude-sonnet-5-5", llmConfig: { thinking_level: "high" } });
    expect(readModelRouterLaunch("claude_agent_sdk", undefined, '{"thinking_level":"high"}')).toBeNull();
  });

  it("unreadable model settings count as none, with one warning for the same value (DESIGN.md rule 7)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(readModelRouterLaunch("codex_app_server", "gpt-sol", "{not json")).toMatchObject({ llmConfig: null });
    expect(readModelRouterLaunch("codex_app_server", "gpt-sol", "{not json")).toMatchObject({ llmConfig: null });
    expect(readModelRouterLaunch("codex_app_server", "gpt-sol", '["high"]')).toMatchObject({ llmConfig: null });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`${MODEL_ROUTER_LLM_CONFIG_SETTING_KEY} is ignored (it is not valid JSON)`));
  });
});

describe("normalizeModelRouterLlmConfigForPersistence (the Server Settings write)", () => {
  it("empty, or one JSON object written compact; anything else is refused", () => {
    expect(normalizeModelRouterLlmConfigForPersistence("")).toEqual([true, ""]);
    expect(normalizeModelRouterLlmConfigForPersistence(' { "thinking_level" : "high" } ')).toEqual([true, '{"thinking_level":"high"}']);
    expect(normalizeModelRouterLlmConfigForPersistence("[1]")).toEqual([false, "The Model Router's model settings must be a JSON object (it is not a JSON object)."]);
  });
});

describe("ModelRoutingSettings.setRouterLaunch: checked like any agent launch, then the three keys", () => {
  const setup = (result: RunModelSelectionValidationResult) => {
    const written: [string, string][] = [];
    const validator = { validate: vi.fn(async () => result) };
    const settings = new ModelRoutingSettings({
      writer: { updateSetting: (key, value) => { written.push([key, value]); return [true, value]; } },
      validator, workspaceRootPath: () => "/data/internal-workspaces/autobyteus-model-router",
    });
    return { settings, validator, written };
  };

  it("AC-002: a valid launch is checked in the router's workspace and stored with the checked model settings", async () => {
    const { settings, validator, written } = setup({ kind: "valid", selection: { llmModelIdentifier: "claude-sonnet-5-5", llmConfig: { thinking_level: "high" } } });
    await settings.setRouterLaunch({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: " claude-sonnet-5-5 ", llmConfig: { thinking_level: "high" } });
    expect(validator.validate).toHaveBeenCalledExactlyOnceWith({
      context: { runtimeKind: "claude_agent_sdk", currentModelIdentifier: "claude-sonnet-5-5", workspaceRootPath: "/data/internal-workspaces/autobyteus-model-router" },
      selection: { llmModelIdentifier: "claude-sonnet-5-5", llmConfig: { thinking_level: "high" } },
    });
    expect(written).toEqual([
      [MODEL_ROUTER_RUNTIME_SETTING_KEY, "claude_agent_sdk"],
      [MODEL_ROUTER_MODEL_SETTING_KEY, "claude-sonnet-5-5"],
      [MODEL_ROUTER_LLM_CONFIG_SETTING_KEY, '{"thinking_level":"high"}'],
    ]);
  });

  it("no model settings (or an empty object) store an empty value", async () => {
    const { settings, written } = setup({ kind: "valid", selection: { llmModelIdentifier: "gpt-sol", llmConfig: {} } });
    await settings.setRouterLaunch({ runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", llmConfig: null });
    expect(written.at(-1)).toEqual([MODEL_ROUTER_LLM_CONFIG_SETTING_KEY, ""]);
  });

  it("AC-002: an invalid launch is refused with the check's message and nothing is written", async () => {
    const invalid = setup({ kind: "invalid", errors: [{ path: "llmConfig.thinking_level", message: "thinking_level must be one of low, medium, high" }] });
    await expect(invalid.settings.setRouterLaunch({ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "claude-sonnet-5-5", llmConfig: { thinking_level: "max" } }))
      .rejects.toThrow("The model settings are invalid: thinking_level must be one of low, medium, high");
    expect(invalid.written).toEqual([]);
    const missing = setup({ kind: "model_unavailable" });
    await expect(missing.settings.setRouterLaunch({ runtimeKind: "codex_app_server", llmModelIdentifier: "gone", llmConfig: null }))
      .rejects.toThrow("The model 'gone' is not available on codex_app_server.");
    expect(missing.written).toEqual([]);
  });

  it("an unknown runtime or an empty model is refused before the check", async () => {
    const { settings, validator } = setup({ kind: "valid", selection: { llmModelIdentifier: "x", llmConfig: null } });
    await expect(settings.setRouterLaunch({ runtimeKind: "nope", llmModelIdentifier: "x", llmConfig: null })).rejects.toThrow("The Model Router's runtime must be one of");
    await expect(settings.setRouterLaunch({ runtimeKind: "codex_app_server", llmModelIdentifier: " ", llmConfig: null })).rejects.toThrow("must not be empty");
    expect(validator.validate).not.toHaveBeenCalled();
  });
});
