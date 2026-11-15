import { describe, expect, it } from "vitest";
import { planMemorySyncBatches } from "../../../src/memory-sync/source/memory-sync-batch-planner.js";
import type { ChangedMemoryFile } from "../../../src/memory-sync/shared/memory-sync-types.js";

const KiB = 1024;
const MiB = 1024 * KiB;
const GiB = 1024 * MiB;

const file = (name: string, size: number): ChangedMemoryFile => ({
  kind: "agents",
  relativePath: name,
  absolutePath: `/memory/agents/${name}`,
  size,
  mtimeMs: 1,
  sha256: "0".repeat(64),
});

const shape = (batches: ReturnType<typeof planMemorySyncBatches>) =>
  batches.map((batch) => batch.files.map((planned) => `${planned.file.relativePath}:${planned.lane}`));

describe("planMemorySyncBatches", () => {
  it("cuts by the inline byte budget and counts staged files toward the file count only", () => {
    const files = [
      file("a", 1 * KiB), file("b", 40 * MiB),
      file("c1", 5 * MiB), file("c2", 5 * MiB), file("c3", 5 * MiB), file("c4", 5 * MiB), file("c5", 5 * MiB), file("c6", 5 * MiB),
      file("d", 2 * GiB),
    ];

    expect(shape(planMemorySyncBatches(files, 25))).toEqual([
      ["a:inline", "b:staged", "c1:inline", "c2:inline", "c3:inline", "c4:inline"],
      ["c5:inline", "c6:inline", "d:staged"],
    ]);
  });

  it("stages a file above the 8 MiB threshold and inlines one at the threshold", () => {
    const batches = planMemorySyncBatches([file("at", 8 * MiB), file("over", 8 * MiB + 1)], 25);

    expect(shape(batches)).toEqual([["at:inline", "over:staged"]]);
  });

  it("keeps staged bytes per batch within 4 GiB, and a larger file goes alone among staged files", () => {
    const batches = planMemorySyncBatches([file("a", 3 * GiB), file("b", 2 * GiB), file("c", 10 * GiB), file("d", 1 * GiB)], 25);

    expect(shape(batches)).toEqual([["a:staged"], ["b:staged"], ["c:staged"], ["d:staged"]]);
  });

  it("cuts by batchSize and returns no batch for no files", () => {
    const files = Array.from({ length: 5 }, (_, index) => file(`f${index}`, 10));

    expect(planMemorySyncBatches(files, 2).map((batch) => batch.files.length)).toEqual([2, 2, 1]);
    expect(planMemorySyncBatches([], 25)).toEqual([]);
  });

  it("keeps every batch of many files below the request limit", () => {
    const files = Array.from({ length: 200 }, (_, index) => file(`f${index}`, 3 * MiB));

    for (const batch of planMemorySyncBatches(files, 25)) {
      const inlineBytes = batch.files.reduce((sum, planned) => sum + planned.file.size, 0);
      expect(Math.ceil(inlineBytes / 3) * 4).toBeLessThan(40 * MiB);
    }
  });
});
