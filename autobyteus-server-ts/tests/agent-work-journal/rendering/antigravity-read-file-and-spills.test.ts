import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RecordBuilder, entryLines, render } from "../journal-record-fixtures.js";

/**
 * autobyteus-561 (follow-ups of 560). FU-1: Antigravity's current file read is `read_file {Path}`; it reads like `view_file`
 * (REQ-001). FU-2: Antigravity records a long tool result as a runtime sentence naming the file that holds the full output; the
 * journal shows the preview and the marker Claude's spill already gets, without the runtime's words (REQ-002); the later read of that
 * file stays an ordinary read (REQ-003). Synthetic paths and previews only (TESTING.md: never copy a user's record).
 */
const agy = RuntimeKind.ANTIGRAVITY_CLI;
const done = (output: unknown) => ({ provider_state: "DONE", output });
const lines = (name: string, args: Record<string, unknown>, result: unknown, error: string | null = null) => {
  const b = new RecordBuilder();
  const call = b.call(name, args);
  return entryLines(render(agy, [call, b.result(call, result, error)]).markdown)
    .map((line) => line.replace(/^\[\d\d:\d\d:\d\d\] /, "").replace(/ \[↗\]\([^)]*\)$/, "").replace(/\[raw#[^\]]*\]\([^)]*\)/g, "raw#…"));
};

describe("read_file reads like view_file (REQ-001)", () => {
  it("AC-001: a size-only read gives the same lines as view_file, with a range and with a byte offset", () => {
    expect(lines("read_file", { Path: "/w/a.json" }, done("1 lines, 2305 bytes")))
      .toEqual(["Command: cat /w/a.json → ok (content not recorded: 1 lines, 2305 bytes)"]);
    expect(lines("read_file", { Path: "/w/a.md", StartLine: 3, EndLine: 9 }, done("7 lines, 120 bytes"))[0])
      .toBe("Command: sed -n '3,9p' /w/a.md → ok (content not recorded: 7 lines, 120 bytes)");
    expect(lines("read_file", { Path: "/w/a.md", StartLine: 3, EndLine: 9, ContentOffset: 40 }, done("text"))[0])
      .toBe("Command: sed -n '3,9p' /w/a.md (from byte 40) → ok");
    for (const args of [{ AbsolutePath: "/w/a.json" }, { Path: "/w/a.json" }]) {
      expect(lines(args.AbsolutePath ? "view_file" : "read_file", args, done("1 lines, 2305 bytes")))
        .toEqual(lines("view_file", { AbsolutePath: "/w/a.json" }, done("1 lines, 2305 bytes")));
    }
  });

  it("view_file is unchanged, and AbsolutePath wins when both are recorded", () => {
    expect(lines("view_file", { AbsolutePath: "/w/a.json" }, done("1 lines, 2305 bytes"))[0])
      .toBe("Command: cat /w/a.json → ok (content not recorded: 1 lines, 2305 bytes)");
    expect(lines("read_file", { AbsolutePath: "/w/first.md", Path: "/w/second.md" }, done("x"))[0]).toBe("Command: cat /w/first.md → ok");
    expect(lines("read_file", {}, done("x"))[0]).toBe("Command: cat '(path not recorded)' → ok");
  });

  it("AC-002: a read_file of a skill file is a skill load; a failed read keeps its error", () => {
    expect(lines("read_file", { Path: "/home/user/.gemini/antigravity-cli/skills/example-skill/SKILL.md" }, done("1 lines, 90 bytes")))
      .toEqual(["Load skill: example-skill → ok"]);
    expect(lines("read_file", { Path: "/w/missing.md" }, { provider_state: "ERROR", output: null }, "open /w/missing.md: no such file")[0])
      .toBe("Command: cat /w/missing.md → failed: open /w/missing.md: no such file");
  });
});

const SPILL_PATH = "/home/user/.gemini/antigravity-cli/brain/abc/.system_generated/steps/12/output.txt";
const spilled = (preview: string, path = SPILL_PATH) =>
  `The tool's output was truncated due to being too long. You can find the full output in a file at file://${path}\n\nHere is a preview with the middle of the output truncated:\n${preview}`;
const MARKER = `…[full output was saved outside the raw trace: ${SPILL_PATH}]`;

describe("a spilled output shows its preview and the marker (REQ-002)", () => {
  it("AC-003: the preview, then the marker; neither runtime sentence nor the file:// form appears; the outcome stays ok", () => {
    expect(lines("run_command", { CommandLine: "ls -la /w" }, done(spilled("total 3\nREADME.md\n<truncated 120 lines>\nz.ts")))).toEqual([
      "Command: ls -la /w → ok", "           total 3", "           README.md", "           …[120 lines not recorded]", "           z.ts", `           ${MARKER}`]);
    const text = lines("run_command", { CommandLine: "ls" }, done(spilled("a\nb"))).join("\n");
    expect(text).not.toContain("truncated due to being too long");
    expect(text).not.toContain("Here is a preview");
    expect(text).not.toContain("file://");
  });

  it("AC-003: the same on a tool of another server (an MCP result) and with CRLF line endings", () => {
    expect(lines("mcp__example_server__list_things", {}, done(spilled("one\ntwo")))).toEqual([
      "Tool: list_things (via example_server) → ok", "           one", "           two", `           ${MARKER}`]);
    expect(lines("run_command", { CommandLine: "ls" }, done(spilled("a\nb").replace(/\n/g, "\r\n")))).toEqual([
      "Command: ls → ok", "           a", "           b", `           ${MARKER}`]);
  });

  it("AC-003: a preview with trailing blank lines does not leave them before the marker", () => {
    expect(lines("run_command", { CommandLine: "ls" }, done(spilled("a\nb\n\n\n")))).toEqual([
      "Command: ls → ok", "           a", "           b", `           ${MARKER}`]);
  });

  it("AC-004: the same sentence in a failing result's error text is normalized the same way", () => {
    const failed = lines("run_command", { CommandLine: "make" }, { provider_state: "ERROR", output: null }, spilled("error: one\nerror: two")).join("\n");
    expect(failed).toContain("failed");
    expect(failed).toContain(MARKER);
    expect(failed).not.toContain("truncated due to being too long");
  });

  it("AC-004: another wording that mentions a path, and a sentence that is not at the start, stay unchanged", () => {
    const other = "Output was cut. The full output is in a file at file:///home/user/x/output.txt\n\nPreview:\nabc";
    expect(lines("run_command", { CommandLine: "ls" }, done(other)).join("\n")).toContain("Output was cut.");
    expect(lines("run_command", { CommandLine: "ls" }, done(other)).join("\n")).not.toContain("saved outside the raw trace");
    const quoted = `listing\n${spilled("a")}`;
    expect(lines("run_command", { CommandLine: "ls" }, done(quoted)).join("\n")).toContain("truncated due to being too long");
  });

  it("AC-004: a preview that itself holds a line starting 'Here is a preview' keeps it", () => {
    const rendered = lines("run_command", { CommandLine: "cat notes" }, done(spilled("intro\nHere is a preview of the page\nend"))).join("\n");
    expect(rendered).toContain("Here is a preview of the page");
    expect(rendered).toContain(MARKER);
    expect(rendered).not.toContain("truncated due to being too long");
  });

  it("AC-004: a nested JSON-escaped form is not rewritten", () => {
    const escaped = JSON.stringify({ output: spilled("a") });
    expect(lines("run_command", { CommandLine: "ls" }, done(escaped)).join("\n")).not.toContain("saved outside the raw trace");
  });

  it("a long result of another runtime with the same words is not rewritten", () => {
    const b = new RecordBuilder();
    const call = b.call("Bash", { command: "ls" });
    const markdown = render(RuntimeKind.CLAUDE_AGENT_SDK, [call, b.result(call, spilled("a"))]).markdown;
    expect(markdown).toContain("truncated due to being too long");
  });
});

describe("the later read of a spill file is an ordinary read (REQ-003)", () => {
  it("AC-005: the spilled call, then a read_file and a shell cat of the same path: both render as read lines; the shell read keeps its content", () => {
    const b = new RecordBuilder();
    const first = b.call("run_command", { CommandLine: "ls" });
    const second = b.call("read_file", { Path: SPILL_PATH, StartLine: 1, EndLine: 50 });
    const third = b.call("run_command", { CommandLine: `cat ${SPILL_PATH}` });
    const text = entryLines(render(agy, [first, b.result(first, done(spilled("a"))), second, b.result(second, done("50 lines, 900 bytes")),
      third, b.result(third, done("the middle of the output"))]).markdown).join("\n");
    expect(text).toContain(`Command: sed -n '1,50p' ${SPILL_PATH} → ok (content not recorded: 50 lines, 900 bytes)`);
    expect(text).toContain(`Command: cat ${SPILL_PATH} → ok`);
    expect(text).toContain("the middle of the output");
  });
});
