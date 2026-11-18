import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readPendingRuntimeHandover } from "../../../src/agent-memory/services/runtime-handover-reader.js";

/**
 * Whether a hand-over is pending is derived from the raw traces (I-11): the first record of the active file is the hand-over
 * marker and no `user` record follows it. The scan is read-only and bounded.
 */
describe("readPendingRuntimeHandover", () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "handover-reader-")); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const active = () => path.join(dir, "raw_traces_active.jsonl");
  const write = (...records: Array<Record<string, unknown> | string>) =>
    fs.writeFileSync(active(), records.map((record) => typeof record === "string" ? record : JSON.stringify(record)).join("\n") + "\n");
  const marker = { id: "rt_marker", trace_type: "system_task_notification", sender_id: "system.runtime_handover", content: "Agent runtime changed.", turn_id: "runtime_switch" };
  const candidate = { id: "rt_instruction", trace_type: "system_instruction", content: "You are the new agent." };
  const user = (id = "rt_user") => ({ id, trace_type: "user", content: "continue", turn_id: "turn_0001" });

  it("is pending while the marker is the first record and no user record follows, and returns the marker", () => {
    write(marker);
    expect(readPendingRuntimeHandover(dir)).toEqual({ markerTraceId: "rt_marker", markerText: "Agent runtime changed." });
    write(marker, candidate);
    expect(readPendingRuntimeHandover(dir)).toMatchObject({ markerTraceId: "rt_marker" });
  });

  it("is done once any user record follows (the first input was recorded), whoever sent it", () => {
    write(marker, candidate, user());
    expect(readPendingRuntimeHandover(dir)).toBeNull();
    write(marker, { ...user("rt_peer"), sender_id: "peer-agent" });
    expect(readPendingRuntimeHandover(dir)).toBeNull();
  });

  it("a run that never switched, a missing file and an empty file have none; the first record decides", () => {
    expect(readPendingRuntimeHandover(dir)).toBeNull();
    fs.writeFileSync(active(), "");
    expect(readPendingRuntimeHandover(dir)).toBeNull();
    write(candidate, marker);
    expect(readPendingRuntimeHandover(dir)).toBeNull();
    write(user(), marker);
    expect(readPendingRuntimeHandover(dir)).toBeNull();
  });

  it("a marker of another sender is not the hand-over marker", () => {
    write({ ...marker, sender_id: "system.tool_list_update_notifier" });
    expect(readPendingRuntimeHandover(dir)).toBeNull();
  });

  it("stops at the first user record: nothing after it is read, so later damage does not matter", () => {
    write(marker, user(), "{ not json at all", user("rt_later"));
    expect(readPendingRuntimeHandover(dir)).toBeNull();
  });

  it("reads without cutting a damaged end", () => {
    write(marker);
    fs.appendFileSync(active(), '{"id":"cut","trace_ty');
    const before = fs.readFileSync(active());
    expect(readPendingRuntimeHandover(dir)).toMatchObject({ markerTraceId: "rt_marker" });
    expect(fs.readFileSync(active()).equals(before)).toBe(true);
  });

  it("is pending again for a marker that survives a restart without a user record (the notice may be carried once more)", () => {
    write(marker, candidate);
    expect(readPendingRuntimeHandover(dir)).not.toBeNull();
    expect(readPendingRuntimeHandover(dir)).not.toBeNull();
  });
});
