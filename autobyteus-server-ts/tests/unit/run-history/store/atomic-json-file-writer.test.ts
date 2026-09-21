import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { atomicWriteJsonFile } from "../../../../src/run-history/store/atomic-json-file-writer.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("atomicWriteJsonFile", () => {
  it("rejects the failed caller while its handled tail releases queued same-path writes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "atomic-json-writer-"));
    roots.push(root);
    const filePath = path.join(root, "history.json");
    await fs.mkdir(filePath);

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => { unhandled.push(reason); };
    process.on("unhandledRejection", onUnhandled);
    try {
      const failed = atomicWriteJsonFile(filePath, { attempt: 1 });
      const queued = atomicWriteJsonFile(filePath, { attempt: 2 });

      await expect(failed).rejects.toBeInstanceOf(Error);
      await fs.rm(filePath, { recursive: true, force: true });
      await expect(queued).resolves.toBeUndefined();
      expect(JSON.parse(await fs.readFile(filePath, "utf8"))).toEqual({ attempt: 2 });

      await expect(atomicWriteJsonFile(filePath, { attempt: 3 })).resolves.toBeUndefined();
      expect(JSON.parse(await fs.readFile(filePath, "utf8"))).toEqual({ attempt: 3 });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
