import { describe, expect, it, vi } from "vitest";
import { LaunchUsabilityCheck } from "../../../src/launch-preferences/launch-usability-check.js";
import { RunModelSelectionService } from "../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

// claude-anthropic-effort-control SR-005 caller #7 (AC-013): every usable launch the check returns carries the
// validated, canonical model selection, so a launched copy never takes a setting its model does not declare.

const EFFORT_SCHEMA = { properties: { reasoning_effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"] } } };
const view = (rows: { model_identifier: string; config_schema: unknown }[]) => ({ offeredModels: rows,
  findExactCurrent: (id: string) => rows.find((row) => row.model_identifier === id) ?? null });

const setup = () => {
  const catalog = { runtimeModelSelectionCatalog: vi.fn(async () => view([
    { model_identifier: "opus", config_schema: EFFORT_SCHEMA },
    { model_identifier: "plain", config_schema: null },
  ])) };
  const validator = new RunModelSelectionService(catalog as never, { resolveMany: vi.fn() } as never);
  const availability = { getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => ({ runtimeKind, enabled: true, reason: null })) };
  return new LaunchUsabilityCheck({ availability: availability as never, validator });
};

const context = { workspaceRootPath: "/work", autoExecuteTools: true };
const inheritedLaunch = (llmConfig: Record<string, unknown> | null) => ({
  runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "opus", llmConfig, autoExecuteTools: true, workspaceRootPath: "/work",
});

describe("LaunchUsabilityCheck canonical launches", () => {
  it("returns a candidate's and the inherited launch's canonical selection, without undeclared settings", async () => {
    const result = await setup().check({
      candidates: [
        { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "opus", llmConfig: { reasoning_effort: "max", thinking_display: "omitted" } },
        { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "plain", llmConfig: { old: true } },
      ],
      context,
      inherited: inheritedLaunch({ reasoning_effort: "high", thinking_display: "summarized" }),
      facts: null,
    });
    expect(result.verdicts).toEqual([
      { usable: true, launch: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "opus",
        llmConfig: { reasoning_effort: "max" }, autoExecuteTools: true, workspaceRootPath: "/work" } },
      { usable: true, launch: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "plain",
        llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" } },
    ]);
    expect(result.inherited).toEqual({ usable: true, launch: inheritedLaunch({ reasoning_effort: "high" }) });
  });

  it("still refuses an invalid value of a declared setting, for a candidate and for the inherited launch", async () => {
    const result = await setup().check({
      candidates: [{ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "opus", llmConfig: { reasoning_effort: "ultra", thinking_display: "omitted" } }],
      context,
      inherited: inheritedLaunch({ reasoning_effort: "ultra" }),
      facts: null,
    });
    expect(result.verdicts).toEqual([{ usable: false, reason: "model_settings_invalid",
      detail: "Its model settings are invalid: Value is not one of the supported options." }]);
    expect(result.inherited).toEqual({ usable: false, detail: "Its model settings are invalid: Value is not one of the supported options." });
  });

  it("reports no inherited verdict when there is no inherited launch", async () => {
    const result = await setup().check({ candidates: [], context, inherited: null, facts: null });
    expect(result).toEqual({ verdicts: [], inherited: null });
  });
});
