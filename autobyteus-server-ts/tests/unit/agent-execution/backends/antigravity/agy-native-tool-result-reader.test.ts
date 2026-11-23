import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AGY_RESULT_MAX_BYTES,
  readAgyNativeToolResult,
  type AgyNativeToolResultLookup,
} from "../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-result-reader.js";

/**
 * autobyteus-377: the full text of a native tool step's result, from the step's row of the CLI's transcript. Synthetic rows only
 * (TESTING.md: never copy a real transcript row, path or conversation id).
 */
const conversationId = "9728775f-9431-44b7-8cb8-afd5cd85a773";
let root: string;
let file: string;
const planner = (step: number, names: string[]) => ({ step_index: step, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE",
  tool_calls: names.map((name) => ({ name, args: {} })) });
const generic = (step: number, content: unknown, extra: Record<string, unknown> = {}) =>
  ({ step_index: step, source: "MODEL", type: "GENERIC", status: "DONE", content, ...extra });
const write = (records: unknown[], suffix = "") => fs.writeFileSync(file, records.map((record) => JSON.stringify(record)).join("\r\n") + "\r\n" + suffix);
const lookup: AgyNativeToolResultLookup = { stepIndex: 2, toolName: "read_file" };
const read = (request = lookup, extra: Record<string, unknown> = {}) =>
  readAgyNativeToolResult(conversationId, request, { brainRoot: root, rereadAttempts: 0, ...extra });
const RANGED = "Created At: x\nCompleted At: y\nShowing lines 5-9 of 40\n5: a\n6: b\n7: c\n8: d\n9: e";
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "agy-native-result-"));
  file = path.join(root, conversationId, ".system_generated/logs/transcript_full.jsonl");
  fs.mkdirSync(path.dirname(file), { recursive: true });
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("readAgyNativeToolResult", () => {
  it("AC-001: reads the row of a single call: the step's content, not the stream's size summary", async () => {
    write([{ step_index: 0, source: "USER_EXPLICIT", type: "USER_INPUT", status: "DONE" }, planner(1, ["read_file"]), generic(2, RANGED), generic(3, "later")]);
    expect(await read()).toEqual({ text: RANGED });
  });

  it("AC-005: a parallel batch: each call's result is its own row's content", async () => {
    write([planner(1, ["read_file", "grep_search"]), generic(2, "first result"), generic(3, "second result")]);
    expect(await read({ stepIndex: 2, toolName: "read_file" })).toEqual({ text: "first result" });
    expect(await read({ stepIndex: 3, toolName: "grep_search" })).toEqual({ text: "second result" });
  });

  it("AC-013: a batch whose earlier siblings are not written yet is identified by position and name", async () => {
    write([planner(1, ["write_file", "edit_file", "grep_search"]), generic(3, "second only"), generic(4, "third")]);
    expect(await read({ stepIndex: 4, toolName: "grep_search" })).toEqual({ text: "third" });
    expect(await read({ stepIndex: 3, toolName: "edit_file" })).toEqual({ text: "second only" });
    expect(await read({ stepIndex: 2, toolName: "write_file" })).toEqual({ reason: "ROW_NOT_FOUND" });
  });

  it("AC-004: a name that is not the one at that position is not guessed (the other call's text is never taken)", async () => {
    write([planner(1, ["read_file", "grep_search"]), generic(2, "first result"), generic(3, "second result")]);
    expect(await read({ stepIndex: 3, toolName: "read_file" })).toEqual({ reason: "ROW_NOT_CORROBORATED" });
    expect(await read({ stepIndex: 2, toolName: "grep_search" })).toEqual({ reason: "ROW_NOT_CORROBORATED" });
  });

  it("AC-004: a position beyond the planner's calls, and a planner without tool calls", async () => {
    write([planner(1, ["read_file"]), generic(2, "a"), generic(3, "b")]);
    expect(await read({ stepIndex: 3, toolName: "read_file" })).toEqual({ reason: "ROW_NOT_CORROBORATED" });
    write([{ step_index: 1, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE" }, generic(2, "a")]);
    expect(await read()).toEqual({ reason: "ROW_NOT_CORROBORATED" });
  });

  it.each([
    ["a missing step", [planner(1, ["read_file"]), generic(3, "x")], { reason: "ROW_NOT_FOUND" }],
    ["a duplicate index", [planner(1, ["read_file"]), generic(2, "a"), generic(2, "b")], { reason: "ROW_NOT_CORROBORATED" }],
    ["rows out of order", [planner(1, ["read_file"]), generic(3, "b"), generic(2, "a")], { reason: "ROW_NOT_CORROBORATED" }],
    ["a step not written yet (the newest row is below it)", [generic(2, "a"), planner(1, ["read_file"])], { reason: "ROW_NOT_FOUND" }],
    ["a row that is not GENERIC", [planner(1, ["read_file"]), { ...generic(2, "a"), type: "CHECKPOINT" }], { reason: "ROW_NOT_CORROBORATED" }],
    ["a row that is not DONE", [planner(1, ["read_file"]), generic(2, "a", { status: "ACTIVE" })], { reason: "ROW_NOT_CORROBORATED" }],
    ["a row of another source", [planner(1, ["read_file"]), generic(2, "a", { source: "USER_EXPLICIT" })], { reason: "ROW_NOT_CORROBORATED" }],
    ["a row without content", [planner(1, ["read_file"]), generic(2, undefined)], { reason: "ROW_NOT_CORROBORATED" }],
    ["a gap below the batch", [planner(0, ["read_file"]), generic(2, "a")], { reason: "ROW_NOT_CORROBORATED" }],
    ["a batch without its planner row", [generic(1, "x"), generic(2, "a")], { reason: "ROW_NOT_CORROBORATED" }],
    ["another row type under the batch", [{ step_index: 1, source: "MODEL", type: "USER_INPUT", status: "DONE" }, generic(2, "a")], { reason: "ROW_NOT_CORROBORATED" }],
  ])("AC-004: %s", async (_label, rows, expected) => {
    write(rows as unknown[]);
    expect(await read()).toEqual(expected);
  });

  it("AC-004: a row that is not JSON, or an invalid step index, makes the transcript unreadable", async () => {
    fs.writeFileSync(file, `${JSON.stringify(planner(1, ["read_file"]))}\n${JSON.stringify(generic(2, "a"))}\nnot json\n`);
    expect(await read()).toEqual({ reason: "TRANSCRIPT_UNREADABLE" });
    write([planner(1, ["read_file"]), { ...generic(2, "a"), step_index: "2" }]);
    expect(await read()).toEqual({ reason: "ROW_NOT_CORROBORATED" });
  });

  it("an empty transcript has no row yet", async () => {
    fs.writeFileSync(file, "");
    expect(await read()).toEqual({ reason: "ROW_NOT_FOUND" });
  });

  it("the file ends without a final newline: that unterminated row is not read (it may be half written)", async () => {
    fs.writeFileSync(file, `${JSON.stringify(planner(1, ["read_file"]))}\n${JSON.stringify(generic(2, "a"))}`);
    expect(await read()).toEqual({ reason: "ROW_NOT_FOUND" });
  });

  it("AC-006: a result over the cap is cut at a character boundary with a marker; the original is not changed", async () => {
    const big = "é".repeat(150 * 1024); // 300 KiB of two-byte characters
    write([planner(1, ["read_file"]), generic(2, big)]);
    const result = await read() as { text: string };
    const [kept, marker] = [result.text.slice(0, result.text.indexOf("\n…[")), result.text.slice(result.text.indexOf("\n…["))];
    expect(Buffer.byteLength(kept)).toBeLessThanOrEqual(AGY_RESULT_MAX_BYTES);
    expect(Buffer.byteLength(kept)).toBeGreaterThan(AGY_RESULT_MAX_BYTES - 2);
    expect(kept).toBe("é".repeat(kept.length));
    expect(marker).toBe(`\n…[${Buffer.byteLength(big) - Buffer.byteLength(kept)} bytes of this result were not recorded]`);
    expect(await read(lookup, { maxBytes: 5 })).toEqual({ text: "éé\n…[" + (Buffer.byteLength(big) - 4) + " bytes of this result were not recorded]" });
  });

  it("AC-006: a row over the 2 MiB row bound is unreadable: the stream's result stays", async () => {
    write([planner(1, ["read_file"]), generic(2, "x".repeat(3 * 1024 * 1024))]);
    expect(await read()).toEqual({ reason: "TRANSCRIPT_UNREADABLE" });
  });

  it("AC-007: an absent brain folder or transcript, a symlinked folder or file, a directory: a reason, never an exception", async () => {
    fs.rmSync(path.join(root, conversationId), { recursive: true });
    expect(await read()).toEqual({ reason: "TRANSCRIPT_UNREADABLE" });
    const outside = path.join(root, "outside");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "log.jsonl"), JSON.stringify(generic(2, "a")) + "\n");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.symlinkSync(path.join(outside, "log.jsonl"), file);
    expect(await read()).toEqual({ reason: "TRANSCRIPT_UNREADABLE" });
    fs.rmSync(file);
    fs.mkdirSync(file);
    expect(await read()).toEqual({ reason: "TRANSCRIPT_UNREADABLE" });
    fs.rmSync(path.join(root, conversationId), { recursive: true });
    fs.symlinkSync(outside, path.join(root, conversationId));
    expect(await read()).toEqual({ reason: "TRANSCRIPT_UNREADABLE" });
  });

  it("an invalid identity is refused before anything is read", async () => {
    write([planner(1, ["read_file"]), generic(2, "a")]);
    expect(await readAgyNativeToolResult("../escape", lookup, { brainRoot: root })).toEqual({ reason: "INVALID_IDENTITY" });
    for (const bad of [{ stepIndex: 0, toolName: "read_file" }, { stepIndex: 1.5, toolName: "read_file" }, { stepIndex: 2, toolName: " " },
      { stepIndex: 2, toolName: "call_mcp_tool" }]) expect(await read(bad)).toEqual({ reason: "INVALID_IDENTITY" });
  });

  it("an aborted lookup returns a reason and reads nothing more", async () => {
    write([planner(1, ["read_file"]), generic(2, "a")]);
    const controller = new AbortController();
    controller.abort();
    expect(await read(lookup, { signal: controller.signal })).toEqual({ reason: "TRANSCRIPT_UNREADABLE" });
  });

  it("a row not written yet is read again a few times and then found; one that never appears is given up (QR-001: bounded)", async () => {
    write([planner(1, ["read_file"])]);
    setTimeout(() => fs.appendFileSync(file, JSON.stringify(generic(2, "late row")) + "\r\n"), 60);
    expect(await readAgyNativeToolResult(conversationId, lookup, { brainRoot: root, rereadAttempts: 5, rereadDelayMs: 40 })).toEqual({ text: "late row" });
    write([planner(1, ["read_file"])]);
    const started = Date.now();
    expect(await readAgyNativeToolResult(conversationId, lookup, { brainRoot: root, rereadAttempts: 3, rereadDelayMs: 20 })).toEqual({ reason: "ROW_NOT_FOUND" });
    expect(Date.now() - started).toBeGreaterThanOrEqual(55);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("a re-read is cancelled by an abort", async () => {
    write([planner(1, ["read_file"])]);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);
    const started = Date.now();
    const result = await readAgyNativeToolResult(conversationId, lookup, { brainRoot: root, rereadAttempts: 50, rereadDelayMs: 100, signal: controller.signal });
    expect("reason" in result).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("QR-001: it reads from the end and stops at the batch's planner row: a long transcript before it is never read", async () => {
    const filler = Array.from({ length: 400 }, (_, index) => ({ ...generic(1000 + index, "x".repeat(2000)), step_index: 1000 + index }));
    write([...filler.map((row, index) => ({ ...row, step_index: index })), planner(400, ["read_file"]), generic(401, "the row")]);
    expect(await read({ stepIndex: 401, toolName: "read_file" })).toEqual({ text: "the row" });
    // Below the planner row only the one older row is read (it proves no duplicate index); rows further down are not visited.
    fs.writeFileSync(file, `not json\n${JSON.stringify(generic(0, "older"))}\n${JSON.stringify(planner(400, ["read_file"]))}\n${JSON.stringify(generic(401, "the row"))}\n`);
    expect(await read({ stepIndex: 401, toolName: "read_file" })).toEqual({ text: "the row" });
    fs.writeFileSync(file, `${JSON.stringify(generic(400, "same index"))}\n${JSON.stringify(planner(400, ["read_file"]))}\n${JSON.stringify(generic(401, "the row"))}\n`);
    expect(await read({ stepIndex: 401, toolName: "read_file" })).toEqual({ reason: "ROW_NOT_CORROBORATED" });
  });
});
