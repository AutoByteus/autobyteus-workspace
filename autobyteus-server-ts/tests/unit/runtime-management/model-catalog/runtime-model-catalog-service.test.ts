import { describe, expect, it, vi } from "vitest";
import { RuntimeModelCatalogService } from "../../../../src/runtime-management/model-catalog/runtime-model-catalog-service.js";
import type { RuntimeModelProvider } from "../../../../src/runtime-management/model-catalog/runtime-model-provider.js";

const buildProvider = (
  runtimeKind: "autobyteus" | "codex_app_server" | "claude_agent_sdk",
): RuntimeModelProvider => ({
  runtimeKind,
  listLlmModels: vi.fn().mockResolvedValue([]),
  reloadLlmModels: vi.fn().mockResolvedValue(undefined),
  reloadLlmModelsForProvider: vi.fn().mockResolvedValue(0),
  listAudioModels: vi.fn().mockResolvedValue([]),
  reloadAudioModels: vi.fn().mockResolvedValue(undefined),
  listImageModels: vi.fn().mockResolvedValue([]),
  reloadImageModels: vi.fn().mockResolvedValue(undefined),
});

describe("RuntimeModelCatalogService", () => {
  it("routes requests by runtime kind", async () => {
    const autobyteusProvider = buildProvider("autobyteus");
    const codexProvider = buildProvider("codex_app_server");
    const claudeProvider = buildProvider("claude_agent_sdk");
    const service = new RuntimeModelCatalogService([
      autobyteusProvider,
      codexProvider,
      claudeProvider,
    ]);

    await service.listLlmModels("codex_app_server");

    expect(codexProvider.listLlmModels).toHaveBeenCalledTimes(1);
    expect(autobyteusProvider.listLlmModels).not.toHaveBeenCalled();
    expect(claudeProvider.listLlmModels).not.toHaveBeenCalled();
  });

  it("falls back to autobyteus runtime when runtime kind is missing", async () => {
    const autobyteusProvider = buildProvider("autobyteus");
    const service = new RuntimeModelCatalogService([autobyteusProvider]);

    await service.reloadLlmModels();
    expect(autobyteusProvider.reloadLlmModels).toHaveBeenCalledTimes(1);
  });
});
