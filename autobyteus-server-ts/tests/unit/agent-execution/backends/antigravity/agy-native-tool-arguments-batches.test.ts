import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAgyNativeToolArguments } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-arguments-reader.js";

/** autobyteus-377 AC-013: the full arguments of a parallel call (REQ-009), identified by position and name. Synthetic rows only. */
const conversationId = "9728775f-9431-44b7-8cb8-afd5cd85a773";
let root: string;
let file: string;
const WRITE = { Path: "/w/new.txt", Content: "one\ntwo\n", Append: false };
const EDIT = { Path: "/w/a.txt", Target: "old", Replacement: "new 🙂" };
const GREP = { Query: "needle", SearchPath: "/w", CaseInsensitive: true, MatchPerLine: true, Includes: ["*.ts"] };
const batch = (step: number, calls: Array<{ name: string; args: Record<string, unknown> }> = [{ name: "write_file", args: WRITE }, { name: "edit_file", args: EDIT }, { name: "grep_search", args: GREP }]) =>
  ({ step_index: step, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE", tool_calls: calls });
const generic = (step: number) => ({ step_index: step, source: "MODEL", type: "GENERIC", status: "DONE" });
const write = (records: unknown[]) => fs.writeFileSync(file, records.map((record) => JSON.stringify(record)).join("\r\n") + "\r\n");
const lookups = {
  write: { stepIndex: 2, toolName: "write_file", summary: { Path: "/w/new.txt" } },
  edit: { stepIndex: 3, toolName: "edit_file", summary: { Path: "/w/a.txt" } },
  grep: { stepIndex: 4, toolName: "grep_search", summary: { Query: "needle", SearchPath: "/w" } },
};
const read = (lookup: (typeof lookups)[keyof typeof lookups]) => readAgyNativeToolArguments(conversationId, lookup, { brainRoot: root });
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "agy-batch-args-"));
  file = path.join(root, conversationId, ".system_generated/logs/transcript_full.jsonl");
  fs.mkdirSync(path.dirname(file), { recursive: true });
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("AC-013: the arguments of each call of a parallel batch", () => {
  it.each([
    ["no sibling row written yet", [batch(1)]],
    ["only the planner and the first row", [batch(1), generic(2)]],
    ["a later sibling finished first", [batch(1), generic(4)]],
    ["every row written", [batch(1), generic(2), generic(3), generic(4)]],
    ["earlier turns above and below", [generic(0), batch(1), generic(2), generic(3), generic(4), batch(5, [{ name: "run_command", args: {} }]), generic(6)]],
  ])("%s: each step gets its own call's full arguments", async (_label, rows) => {
    write(rows);
    expect(await read(lookups.write)).toEqual(WRITE);
    expect(await read(lookups.edit)).toEqual(EDIT);
    expect(await read(lookups.grep)).toEqual(GREP);
  });

  it("a name that does not match at the position keeps the summary (null); so does a position beyond the calls", async () => {
    write([batch(1), generic(2), generic(3), generic(4)]);
    expect(await read({ ...lookups.write, toolName: "edit_file" })).toBeNull();
    expect(await read({ ...lookups.grep, stepIndex: 5, toolName: "grep_search" })).toBeNull();
    write([batch(1, [{ name: "write_file", args: WRITE }, { name: "write_file", args: { ...WRITE, Path: "/w/other.txt" } }]), generic(2), generic(3)]);
    expect(await read(lookups.write)).toEqual(WRITE);
    expect(await read({ ...lookups.write, stepIndex: 3, summary: { Path: "/w/other.txt" } })).toEqual({ ...WRITE, Path: "/w/other.txt" });
  });

  it("the summary must still agree with the call at that position", async () => {
    write([batch(1), generic(2), generic(3), generic(4)]);
    expect(await read({ ...lookups.write, summary: { Path: "/w/other.txt" } })).toBeNull();
  });

  it("a row that is not a GENERIC row of the model, a duplicate index, or an unfinished planner row are not guessed", async () => {
    write([batch(1), { ...generic(2), type: "CHECKPOINT" }, generic(3)]);
    expect(await read(lookups.edit)).toBeNull();
    write([batch(1), generic(2), generic(2), generic(3)]);
    expect(await read(lookups.edit)).toBeNull();
    write([{ ...batch(1), status: "ACTIVE" }, generic(2), generic(3)]);
    expect(await read(lookups.edit)).toBeNull();
  });
});
