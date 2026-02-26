import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { ActiveRunOverridePolicy } from "../../../../src/run-history/services/active-run-override-policy.js";

describe("ActiveRunOverridePolicy", () => {
  it("flags all runtime overrides as ignored for active runs", () => {
    const policy = new ActiveRunOverridePolicy();

    const ignored = policy.resolveIgnoredConfigFields({
      llmModelIdentifier: "model-x",
      llmConfig: { temperature: 0.4 },
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      workspaceRootPath: "/tmp/project",
      runtimeKind: "codex_app_server",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "sess-1",
        threadId: null,
        metadata: null,
      },
    });

    expect(ignored).toEqual([
      "llmModelIdentifier",
      "llmConfig",
      "autoExecuteTools",
      "skillAccessMode",
      "workspaceRootPath",
      "runtimeKind",
      "runtimeReference",
    ]);
  });
});
