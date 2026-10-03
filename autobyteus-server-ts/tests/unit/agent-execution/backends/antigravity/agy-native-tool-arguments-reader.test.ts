import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readAgyNativeToolArguments, type AgyNativeToolArgumentLookup } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-arguments-reader.js";

const conversationId = "9728775f-9431-44b7-8cb8-afd5cd85a773";
let root: string;
let file: string;
const planner = (step: number, args: unknown, name = "replace_file_content") => ({ step_index: step,
  source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE", tool_calls: [{ name, args }] });
const row = (step: number) => ({ step_index: step, source: "MODEL", type: "GENERIC", status: "DONE" });
const lookup: AgyNativeToolArgumentLookup = { stepIndex: 6, toolName: "replace_file_content", summary: { TargetFile: "/same.txt" } };
const actual = { TargetFile: "/same.txt", TargetContent: "before\n", ReplacementContent: "after\n🙂",
  StartLine: 0, AllowMultiple: false, Description: "", options: [false, 0, "", null, { typed: true }] };
const write = (records: unknown[], suffix = "") => fs.writeFileSync(file, records.map((record) => JSON.stringify(record)).join("\r\n") + "\r\n" + suffix);
const read = (request = lookup) => readAgyNativeToolArguments(conversationId, request, { brainRoot: root });
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "agy-native-args-"));
  file = path.join(root, conversationId, ".system_generated/logs/transcript_full.jsonl");
  fs.mkdirSync(path.dirname(file), { recursive: true });
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("AGY call-specific typed native arguments", () => {
  it("uses only the disposable HOME's bound conversation when no brainRoot override is supplied", async () => {
    const ownedBrain = path.join(root, ".gemini/antigravity-cli/brain", conversationId, ".system_generated/logs");
    fs.mkdirSync(ownedBrain, { recursive: true });
    fs.writeFileSync(path.join(ownedBrain, "transcript_full.jsonl"), JSON.stringify(planner(5, actual)) + "\n");
    vi.stubEnv("HOME", root); vi.resetModules();
    try {
      const reader = await import("../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-arguments-reader.js");
      expect(await reader.readAgyNativeToolArguments(conversationId, lookup)).toEqual(actual);
    } finally { vi.unstubAllEnvs(); vi.resetModules(); }
  });

  it("preserves exact multiline/Unicode/false/zero/empty/array values, not standard-log per-value JSON strings", async () => {
    write([row(4), planner(5, actual), row(6)]);
    expect(await read({ ...lookup, summary: { ...actual } })).toEqual(actual);
    expect(await read()).toEqual(actual);
    write([planner(5, { ...actual, StartLine: "0", AllowMultiple: "false", options: JSON.stringify(actual.options) })]);
    expect(await read({ ...lookup, summary: { StartLine: 0 } })).toBeNull();
  });

  it("selects exact adjacent steps even for repeated edits to the same path and withheld events beyond the latest chunk", async () => {
    const newer = { ...actual, ReplacementContent: "second edit" };
    write([row(0), planner(1, actual), row(2), planner(5, newer), row(6),
      ...Array.from({ length: 90 }, (_, index) => ({ ...row(7 + index), content: "x".repeat(40000) }))]);
    expect(await read({ ...lookup, stepIndex: 2 })).toEqual(actual);
    expect(await read()).toEqual(newer);
    expect(await read({ ...lookup, stepIndex: 4 })).toBeNull();
  });

  it.each([
    ["non-DONE", { ...planner(5, actual), status: "ACTIVE" }],
    ["wrong source", { ...planner(5, actual), source: "USER_EXPLICIT" }],
    ["wrong type", { ...planner(5, actual), type: "GENERIC" }],
    ["wrong name", planner(5, actual, "write_to_file")],
    ["array args", planner(5, [actual])],
    ["string args", planner(5, JSON.stringify(actual))],
    ["absent args", planner(5, undefined)],
    ["multi-call", { ...planner(5, actual), tool_calls: [{ name: lookup.toolName, args: actual }, { name: lookup.toolName, args: actual }] }],
    ["no call", { ...planner(5, actual), tool_calls: [] }],
    ["wrong index type", { ...planner(5, actual), step_index: "5" }],
  ])("declines %s candidate", async (_label, candidate) => {
    write([row(4), candidate, row(6)]);
    expect(await read()).toBeNull();
  });

  it.each([
    ["duplicate candidate", [planner(5, actual), planner(5, actual), row(6)]],
    ["duplicate newer index", [planner(5, actual), row(6), row(6)]],
    ["inconsistent descending range", [planner(5, actual), row(7), row(6)]],
    ["future-only planner", [planner(7, actual)]],
    ["earlier-only planner", [planner(3, actual)]],
    ["noninteger index", [planner(5, actual), row(6.5)]],
  ])("declines %s range", async (_label, records) => {
    write(records);
    expect(await read()).toBeNull();
  });

  it("rejects malformed candidate/neighbor rows but discards partial trailing rows", async () => {
    write([row(4), planner(5, actual), row(6)], '{"step_index":7');
    expect(await read()).toEqual(actual);
    fs.writeFileSync(file, JSON.stringify(row(4)) + '\n{bad candidate}\n' + JSON.stringify(row(6)) + '\n');
    expect(await read()).toBeNull();
    fs.writeFileSync(file, '{bad neighbor}\n' + JSON.stringify(planner(5, actual)) + '\n');
    expect(await read()).toBeNull();
    fs.writeFileSync(file, '\n' + JSON.stringify(planner(5, actual)) + '\n');
    expect(await read()).toBeNull();
    fs.writeFileSync(file, JSON.stringify(row(4)) + '\n' + JSON.stringify(planner(5, actual)));
    expect(await read()).toBeNull();
  });

  it.each([{ TargetFile: "/different.txt" }, { StartLine: "0" }, { AllowMultiple: 0 }, { Missing: "" },
    { options: [false, 0, "", null, { typed: "true" }] }])("corroborates every summary own key with exact typed values (%j)", async (summary) => {
    write([planner(5, actual)]);
    expect(await read({ ...lookup, summary })).toBeNull();
  });

  it("allows only the evidenced native run_command.CommandLine Unicode-ellipsis prefix exception", async () => {
    const args = { CommandLine: "printf 'long command with tail'", Cwd: "/work", IsDaemon: false };
    write([planner(5, args, "run_command")]);
    const command = { ...lookup, toolName: "run_command", summary: { CommandLine: "printf 'long…", Cwd: "/work" } };
    expect(await read(command)).toEqual(args);
    for (const summary of [{ CommandLine: "…" }, { CommandLine: "printf 'long..." }, { CommandLine: "printf long…" },
      { CommandLine: "printf 'long…", Cwd: "/work…" }]) {
      expect(await read({ ...command, summary })).toBeNull();
    }
    write([planner(5, { CommandLine: "prefixX" }, "run_command")]);
    expect(await read({ ...command, summary: { CommandLine: "prefix…" } })).toBeNull();
    write([planner(5, { ...actual, ReplacementContent: "prefix and tail" })]);
    expect(await read({ ...lookup, summary: { ReplacementContent: "prefix…" } })).toBeNull();
  });

  it("declines missing, unsafe, oversized, aborted, wrong-conversation and invalid lookup evidence", async () => {
    expect(await read()).toBeNull();
    write([planner(5, actual)]);
    expect(await readAgyNativeToolArguments("../../../other", lookup, { brainRoot: root })).toBeNull();
    expect(await readAgyNativeToolArguments("1264decb-6e19-48cc-aae0-493688b2a301", lookup, { brainRoot: root })).toBeNull();
    for (const request of [{ ...lookup, stepIndex: -1 }, { ...lookup, stepIndex: 6.5 },
      { ...lookup, stepIndex: Number.MAX_SAFE_INTEGER + 1 }, { ...lookup, toolName: "call_mcp_tool" }]) {
      expect(await read(request)).toBeNull();
    }
    const controller = new AbortController(); controller.abort();
    expect(await readAgyNativeToolArguments(conversationId, lookup, { brainRoot: root, signal: controller.signal })).toBeNull();
    write([planner(5, { ...actual, ReplacementContent: "x".repeat(2 * 1024 * 1024) })]);
    expect(await read()).toBeNull();
    fs.renameSync(file, file + ".real"); fs.symlinkSync(file + ".real", file);
    expect(await read()).toBeNull();
  });
});
