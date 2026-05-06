import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexModelCatalogIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

describeCodexModelCatalogIntegration("CodexModelCatalog integration (live transport)", () => {
  it("lists live Codex models with usable identifiers and normalized config", async () => {
    const catalog = new CodexModelCatalog();

    const models = await catalog.listModels();

    expect(models.length).toBeGreaterThan(0);
    expect(
      models.every(
        (model) =>
          typeof model.model_identifier === "string" && model.model_identifier.length > 0,
      ),
    ).toBe(true);

    for (const model of models) {
      const schema = model.config_schema as
        | {
            parameters?: Array<{
              name?: string;
              type?: string;
              enum_values?: string[];
            }>;
          }
        | null
        | undefined;

      if (!schema?.parameters?.length) {
        continue;
      }

      const reasoningParam = schema.parameters.find(
        (parameter) => parameter.name === "reasoning_effort",
      );
      if (reasoningParam) {
        expect(reasoningParam.type).toBe("enum");
        expect(
          (reasoningParam.enum_values ?? []).every((value) =>
            ["none", "low", "medium", "high", "xhigh"].includes(value),
          ),
        ).toBe(true);
      }

      const serviceTierParam = schema.parameters.find(
        (parameter) => parameter.name === "service_tier",
      );
      if (serviceTierParam) {
        expect(serviceTierParam.type).toBe("enum");
        expect(serviceTierParam.enum_values).toEqual(["fast"]);
      }
    }
  });
});
