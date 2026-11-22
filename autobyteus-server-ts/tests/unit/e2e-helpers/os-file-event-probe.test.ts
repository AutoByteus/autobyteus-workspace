import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The shared file-event probe (autobyteus-579 I-3, AC-004): a timed-out file-event wait is labeled `ENVIRONMENT` when a
 * fresh raw `fs.watch` gets no event, `INCONCLUSIVE` when it gets one; the wait's own message follows the label. The
 * no-event case is made by a raw watch that never fires (the busy-host case, without a busy host).
 */
const fsState = vi.hoisted(() => ({ silent: false }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const watch = ((...args: Parameters<typeof actual.watch>) => (fsState.silent
    ? ({ close: () => undefined } as unknown as ReturnType<typeof actual.watch>)
    : actual.watch(...args))) as typeof actual.watch;
  return { ...actual, default: { ...actual, watch }, watch };
});

const { ENVIRONMENT_LABEL, INCONCLUSIVE_LABEL, labelFileEventTimeout } = await import("../../helpers/os-file-event-probe.js");

describe("labelFileEventTimeout", () => {
  const dirs: string[] = [];
  afterEach(() => { fsState.silent = false; dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })); });

  it("labels ENVIRONMENT when the OS delivers no event to a fresh raw watch, then gives the wait's message", async () => {
    fsState.silent = true;
    const error = await labelFileEventTimeout(new Error("planner issue: not met within 30000 ms; last value: null"), { probeMs: 200 });
    expect(error.message.startsWith("ENVIRONMENT:")).toBe(true);
    expect(error.message).toBe(`${ENVIRONMENT_LABEL}\nplanner issue: not met within 30000 ms; last value: null`);
  });

  it("labels INCONCLUSIVE when a fresh raw watch gets its event", async () => {
    const error = await labelFileEventTimeout("the notes.md event: not met within 15000 ms");
    expect(error.message).toBe(`${INCONCLUSIVE_LABEL}\nthe notes.md event: not met within 15000 ms`);
  });

  it("probes in the watched folder when it exists, and leaves no sentinel there", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "os-file-event-probe-test-"));
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, "keep.md"), "keep\n");
    const error = await labelFileEventTimeout("x", { dir });
    expect(error.message.startsWith("INCONCLUSIVE:")).toBe(true);
    expect(fs.readdirSync(dir)).toEqual(["keep.md"]);
  });

  it("probes in a new temp folder when the watched folder is gone (a moved package)", async () => {
    fsState.silent = true;
    const gone = path.join(os.tmpdir(), `os-file-event-probe-gone-${process.pid}-${Date.now()}`);
    const error = await labelFileEventTimeout("FOLDER_MISSING: not met", { dir: gone, probeMs: 200 });
    expect(error.message.startsWith("ENVIRONMENT:")).toBe(true);
    expect(fs.existsSync(gone)).toBe(false);
  });
});
