import { describe, expect, it } from "vitest";
import {
  buildFileFailure,
  fileFailureRetryDelayMs,
  isFileFailureDue,
} from "../../../src/memory-sync/source/memory-sync-file-failure-policy.js";
import type { MemoryFileEntry } from "../../../src/memory-sync/shared/memory-sync-types.js";

const entry: MemoryFileEntry = { kind: "agents", relativePath: "r/v.mp4", absolutePath: "/m/agents/r/v.mp4", size: 100, mtimeMs: 5000.5 };
const now = new Date("2026-11-15T12:00:00.000Z");

describe("file failure policy", () => {
  it("doubles the retry delay from 1 minute up to 1 hour", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((attempts) => fileFailureRetryDelayMs(attempts) / 60_000)).toEqual([1, 2, 4, 8, 16, 32, 60, 60]);
  });

  it("counts attempts for the same file version and restarts for a changed one", () => {
    const first = buildFileFailure(entry, "boom", undefined, now);
    const second = buildFileFailure(entry, "boom", first, new Date(now.getTime() + 60_000));
    const changed = buildFileFailure({ ...entry, size: 101 }, "boom", second, now);

    expect(first).toMatchObject({ attempts: 1, nextAttemptAt: "2026-11-15T12:01:00.000Z" });
    expect(second.attempts).toBe(2);
    expect(changed.attempts).toBe(1);
  });

  it("is due at its time, on Sync now, and at once when the file changed", () => {
    const failure = buildFileFailure(entry, "boom", undefined, now);

    expect(isFileFailureDue(failure, entry, "background", now)).toBe(false);
    expect(isFileFailureDue(failure, entry, "background", new Date(now.getTime() + 60_000))).toBe(true);
    expect(isFileFailureDue(failure, entry, "manual", now)).toBe(true);
    expect(isFileFailureDue(failure, { ...entry, mtimeMs: 9000 }, "background", now)).toBe(true);
    expect(isFileFailureDue(failure, { ...entry, size: 7 }, "background", now)).toBe(true);
  });
});
