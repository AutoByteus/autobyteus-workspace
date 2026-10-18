import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EMBEDDING_MODEL_ID, EMBEDDING_MODEL_CATALOG } from "../../../src/embeddings/catalog/embedding-model-catalog.js";
import { EMBEDDING_MODEL_SETTING_DESCRIPTION, normalizeEmbeddingModelSettingForPersistence, resolveActiveEmbeddingModel } from "../../../src/embeddings/catalog/embedding-model-setting.js";
import { selectRelevant } from "../../../src/embeddings/relevance.js";
import { EmbeddingModelRunner } from "../../../src/embeddings/runtime/embedding-model-runner.js";
import { fakeModel } from "../../helpers/fake-embedding-model.js";

afterEach(() => vi.restoreAllMocks());

describe("embedding model catalog and setting", () => {
  it("offers the three approved models with Granite small R2 as the default and listed first, each pinned with checksums, and documents each licence and source", () => {
    expect(EMBEDDING_MODEL_CATALOG.map((model) => model.id)).toEqual(["granite-embedding-small-english-r2", "mdbr-leaf-ir", "embeddinggemma-2"]);
    expect(DEFAULT_EMBEDDING_MODEL_ID).toBe("granite-embedding-small-english-r2");
    expect(EMBEDDING_MODEL_SETTING_DESCRIPTION).toContain("Blank uses the default (granite-embedding-small-english-r2).");
    expect(EMBEDDING_MODEL_SETTING_DESCRIPTION.indexOf("granite-embedding-small-english-r2: ")).toBeLessThan(EMBEDDING_MODEL_SETTING_DESCRIPTION.indexOf("mdbr-leaf-ir: "));
    const docs = fs.readFileSync(path.resolve(import.meta.dirname, "../../../docs/modules/embeddings.md"), "utf8");
    for (const model of EMBEDDING_MODEL_CATALOG) {
      expect(model.source.revision).toMatch(/^[0-9a-f]{40}$/);
      const row = docs.split("\n").find((line) => line.startsWith(`| \`${model.id}\``));
      expect(row).toContain(` ${model.licence} `);
      expect(row).toContain(`${model.source.repo}\` @ \`${model.source.revision}`);
      for (const file of model.files) expect(file).toMatchObject({ sha256: expect.stringMatching(/^[0-9a-f]{64}$/), bytes: expect.any(Number) });
      const paths = model.files.map((file) => file.path);
      expect(paths).toEqual(expect.arrayContaining([model.onnxFile, model.tokenizerFiles.tokenizer, model.tokenizerFiles.config]));
    }
  });

  it("resolves blank to the default, a catalog id to its model, and an unknown value to the default with one warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(resolveActiveEmbeddingModel("").id).toBe("granite-embedding-small-english-r2");
    expect(resolveActiveEmbeddingModel(" embeddinggemma-2 ").id).toBe("embeddinggemma-2");
    expect(resolveActiveEmbeddingModel("nomic-v9").id).toBe("granite-embedding-small-english-r2");
    expect(resolveActiveEmbeddingModel("nomic-v9").id).toBe("granite-embedding-small-english-r2");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("EMBEDDING_MODEL_SETTING_UNKNOWN", expect.objectContaining({ value: "nomic-v9" }));
  });

  it("accepts blank or a catalog id and rejects anything else when the setting is saved", () => {
    expect(normalizeEmbeddingModelSettingForPersistence("  ")).toEqual([true, ""]);
    expect(normalizeEmbeddingModelSettingForPersistence("granite-embedding-small-english-r2")).toEqual([true, "granite-embedding-small-english-r2"]);
    expect(normalizeEmbeddingModelSettingForPersistence("gpt-embed")[0]).toBe(false);
  });
});

describe("relevance rule", () => {
  const calibration = { clearMatchFloor: 0.5, nearBestMargin: 0.1 };
  it("keeps the items within the margin of the best, best-first, up to the limit", () => {
    const scored = [{ id: "a", score: 0.7 }, { id: "b", score: 0.9 }, { id: "c", score: 0.85 }, { id: "d", score: 0.81 }];
    expect(selectRelevant(scored, calibration, 20).map((item) => item.id)).toEqual(["b", "c", "d"]);
    expect(selectRelevant(scored, calibration, 2).map((item) => item.id)).toEqual(["b", "c"]);
  });
  it("returns nothing when even the best score is below the floor", () => {
    expect(selectRelevant([{ id: "a", score: 0.49 }], calibration, 20)).toEqual([]);
    expect(selectRelevant([], calibration, 20)).toEqual([]);
  });
});

describe("EmbeddingModelRunner", () => {
  it("starts the real worker entry and reports a model that cannot be loaded", async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "embedding-runner-"));
    const runner = new EmbeddingModelRunner(fakeModel("missing", { onnxFile: "onnx/model.onnx" }), dir, { threads: 1 });
    try {
      await expect(runner.start()).rejects.toThrow("The embedding model could not be loaded");
      await expect(runner.embed("query", ["hello"])).rejects.toThrow("The embedding model could not be loaded");
    } finally {
      await runner.stop();
      await fsp.rm(dir, { recursive: true, force: true });
    }
  });
});
