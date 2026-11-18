import { describe, expect, it } from "vitest";
import {
  isUnavailableModelSelection,
  modelListUnreadableText,
  modelNotOfferedText,
  runModelSelectionRefusal,
} from "../../../../src/llm-management/services/run-model-selection-refusal.js";

describe("run model selection refusal wording (REQ-013, AC-013)", () => {
  const base = { llmModelIdentifier: "claude-fable-5-1[1m]", runtimeKind: "claude_agent_sdk", scopeAddress: "/supervised_research_team/researcher" };

  it("a model the runtime does not offer names the model and scope, says to refresh the list, and that nothing was saved", () => {
    expect(runModelSelectionRefusal({ ...base, result: { kind: "model_unavailable" }, savedSettingsUnchanged: true })).toEqual({
      outcome: "MODEL_UNAVAILABLE",
      message: "'claude-fable-5-1[1m]' is not offered by Claude Agent SDK now (for '/supervised_research_team/researcher'). "
        + "Refresh the model list and choose again. Saved settings were not changed.",
    });
  });

  it("an unreadable list says so, suggests trying again, and is a distinct outcome", () => {
    expect(runModelSelectionRefusal({ ...base, result: { kind: "model_list_unavailable" }, savedSettingsUnchanged: true })).toEqual({
      outcome: "MODEL_LIST_UNAVAILABLE",
      message: "The model list of Claude Agent SDK could not be read. Try again. Saved settings were not changed.",
    });
  });

  it("keeps the runtime's own diagnostic in the unreadable text, without doubling its full stop", () => {
    expect(modelListUnreadableText("antigravity_cli", "Antigravity model discovery timed out; check the CLI and retry."))
      .toBe("The model list of Antigravity CLI could not be read: Antigravity model discovery timed out; check the CLI and retry. Try again.");
  });

  it("a launch (nothing was being saved) leaves out the saved-settings sentence; the scope is optional", () => {
    expect(runModelSelectionRefusal({ llmModelIdentifier: "m", runtimeKind: "codex_app_server",
      result: { kind: "model_unavailable" }, savedSettingsUnchanged: false }).message)
      .toBe("'m' is not offered by Codex App Server now. Refresh the model list and choose again.");
    expect(modelNotOfferedText({ llmModelIdentifier: "m", runtimeKind: "codex_app_server" })).not.toContain("(for");
  });

  it("an unreadable schema keeps its outcome and wording", () => {
    expect(runModelSelectionRefusal({ ...base, result: { kind: "schema_unavailable" }, savedSettingsUnchanged: true })).toEqual({
      outcome: "SCHEMA_UNAVAILABLE",
      message: "The settings of model 'claude-fable-5-1[1m]' could not be checked. Saved settings were not changed.",
    });
  });

  it("recognizes exactly the three unavailable kinds", () => {
    expect(isUnavailableModelSelection({ kind: "model_unavailable" })).toBe(true);
    expect(isUnavailableModelSelection({ kind: "model_list_unavailable" })).toBe(true);
    expect(isUnavailableModelSelection({ kind: "schema_unavailable" })).toBe(true);
    expect(isUnavailableModelSelection({ kind: "invalid", errors: [] })).toBe(false);
    expect(isUnavailableModelSelection({ kind: "valid", selection: { llmModelIdentifier: "m", llmConfig: null } })).toBe(false);
  });
});
