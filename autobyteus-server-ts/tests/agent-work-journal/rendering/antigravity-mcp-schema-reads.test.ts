import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RecordBuilder, entryLines, render } from "../journal-record-fixtures.js";

/**
 * autobyteus-560: the Antigravity CLI reads `<home>/.gemini/antigravity-cli/mcp/<server>/<tool>.json` before each lazy MCP tool.
 * That is runtime plumbing, so the journal leaves a successful read out (REQ-001); a failed read or one with no result stays (REQ-002);
 * everything else renders as before (REQ-003). Synthetic paths only (TESTING.md: never copy a user's record).
 */
const agy = RuntimeKind.ANTIGRAVITY_CLI;
const SCHEMA = "/home/user/.gemini/antigravity-cli/mcp/example_server/example_tool.json";
const done = (output: unknown) => ({ provider_state: "DONE", output });
const OK_SIZE = done("1 lines, 617 bytes");

/** A read followed by an MCP call, so the journal always has something to keep. */
const journalOf = (runtimeKind: RuntimeKind | null, read: (b: RecordBuilder) => unknown[]) => {
  const b = new RecordBuilder();
  const records = [b.user("go"), ...read(b) as never[], ...b.tool("mcp__example_server__example_tool", { sku: "S" }, done("10"))];
  return { records, ...render(runtimeKind, records), lines: entryLines(render(runtimeKind, records).markdown) };
};
const readFile = (path: string, extra: Record<string, unknown> = {}) => (b: RecordBuilder) => b.tool("read_file", { Path: path, ...extra }, OK_SIZE);
const shown = (lines: string[]) => lines.filter((line) => !line.includes("example_tool (via example_server)") && !line.includes("User"));

describe("an Antigravity read of an MCP schema file is left out of the journal", () => {
  it("AC-001: a read_file of <home>/.gemini/antigravity-cli/mcp/<server>/<tool>.json and its result leave no line; the MCP call stays", () => {
    const r = journalOf(agy, readFile(SCHEMA));
    expect(r.markdown).not.toContain("read_file");
    expect(r.markdown).not.toContain(".gemini");
    expect(r.lines.some((line) => line.includes("example_tool"))).toBe(true);
    expect(r.markdown).not.toContain("call not in this file");
    // user + the read's call and result are not rendered as entries; the MCP call and its result are.
    expect(r.omittedRecordCount).toBe(2);
    expect(r.renderedRecordCount).toBe(3);
    expect(r.omittedRecordCount + r.renderedRecordCount).toBe(r.records.length);
  });

  it.each([
    ["read_file with a line range", readFile(SCHEMA, { StartLine: 1, EndLine: 60 })],
    ["view_file {AbsolutePath}", (b: RecordBuilder) => b.tool("view_file", { AbsolutePath: SCHEMA }, OK_SIZE)],
    ["view_file with a range and a byte offset", (b: RecordBuilder) => b.tool("view_file", { AbsolutePath: SCHEMA, StartLine: 1, EndLine: 40, ContentOffset: 8 }, OK_SIZE)],
    ["run_command cat", (b: RecordBuilder) => b.tool("run_command", { CommandLine: `cat ${SCHEMA}`, Cwd: "/work" }, done("{}"))],
    ["run_command cat -n", (b: RecordBuilder) => b.tool("run_command", { CommandLine: `cat -n ${SCHEMA}` }, done("{}"))],
    ["run_command sed -n", (b: RecordBuilder) => b.tool("run_command", { CommandLine: `sed -n '1,60p' ${SCHEMA}` }, done("{}"))],
    ["run_command head", (b: RecordBuilder) => b.tool("run_command", { CommandLine: `head -n 40 ${SCHEMA}` }, done("{}"))],
    ["run_command with a quoted path", (b: RecordBuilder) => b.tool("run_command", { CommandLine: `cat '${SCHEMA}'` }, done("{}"))],
    ["Bash cat", (b: RecordBuilder) => b.tool("Bash", { command: `cat ${SCHEMA}` }, done("{}"))],
    ["the server's instructions.md", readFile("/home/user/.gemini/antigravity-cli/mcp/example_server/instructions.md")],
    ["the data folder .gemini/antigravity", readFile("/home/user/.gemini/antigravity/mcp/example_server/example_tool.json")],
    ["a Windows path", readFile("C:\\Users\\user\\.gemini\\antigravity-cli\\mcp\\example_server\\example_tool.json")],
    ["a path without a leading folder", readFile(".gemini/antigravity-cli/mcp/example_server/example_tool.json")],
  ])("AC-002: %s", (_label, read) => {
    const r = journalOf(agy, read);
    expect(r.omittedRecordCount).toBe(2);
    expect(shown(r.lines).filter((line) => /read_file|view_file|cat |sed |head |Command:|Tool:/.test(line) && !line.includes("example_tool (via"))).toEqual([]);
    expect(r.markdown).not.toContain("antigravity-cli");
  });
});

describe("a read that failed, or has no result, is shown as today (REQ-002)", () => {
  it("AC-003: an error result", () => {
    const b = new RecordBuilder();
    const call = b.call("read_file", { Path: SCHEMA });
    const r = render(agy, [b.user("go"), call, b.result(call, { provider_state: "ERROR", output: null }, `open ${SCHEMA}: no such file`)]);
    expect(r.markdown).toContain("Tool: read_file");
    expect(r.markdown).toContain("failed");
    expect(r.omittedRecordCount).toBe(0);
  });

  it("AC-003: a result that is not DONE", () => {
    const b = new RecordBuilder();
    const call = b.call("view_file", { AbsolutePath: SCHEMA });
    const r = render(agy, [call, b.result(call, { provider_state: "CANCELED", output: null }, "Tool execution interrupted.")]);
    expect(r.markdown).toContain("cat " + SCHEMA);
    expect(r.omittedRecordCount).toBe(0);
  });

  it("AC-003: a read with no result in the file (still running, or its result is in the next file)", () => {
    const b = new RecordBuilder();
    const r = render(agy, [b.user("go"), b.call("read_file", { Path: SCHEMA })]);
    expect(r.markdown).toContain("Tool: read_file");
    expect(r.renderedRecordCount).toBe(2);
    expect(r.omittedRecordCount).toBe(0);
  });

  it("AC-003: a failed shell read keeps its command line", () => {
    const b = new RecordBuilder();
    const call = b.call("run_command", { CommandLine: `cat ${SCHEMA}` });
    const r = render(agy, [call, b.result(call, { provider_state: "ERROR", output: "cat: no such file" }, "exit status 1")]);
    expect(r.markdown).toContain(`Command: cat ${SCHEMA}`);
    expect(r.omittedRecordCount).toBe(0);
  });
});

describe("everything else renders exactly as before (REQ-003)", () => {
  const unchanged = (label: string, read: (b: RecordBuilder) => unknown[], runtimeKind: RuntimeKind | null = agy) =>
    it(`AC-004: ${label}`, () => {
      const r = journalOf(runtimeKind, read);
      expect(r.omittedRecordCount, "nothing is omitted").toBe(0);
      expect(r.renderedRecordCount, "every record is rendered").toBe(r.records.length);
    });

  unchanged("an ordinary file", readFile("/work/repo/src/index.ts"));
  unchanged("a repository's own mcp/<x>/<y>.json outside .gemini/antigravity*", readFile("/work/repo/mcp/example_server/example_tool.json"));
  unchanged("a path under another .gemini folder", readFile("/home/user/.gemini/other-cli/mcp/example_server/example_tool.json"));
  unchanged("a shell read of a repository's own mcp folder", (b) => b.tool("run_command", { CommandLine: "cat /work/repo/mcp/example_server/example_tool.json" }, done("{}")));
  unchanged("a .system_generated spill read (real content of an earlier tool)", (b) =>
    b.tool("run_command", { CommandLine: "cat /home/user/.gemini/antigravity/brain/abc/.system_generated/steps/3/output.txt" }, done("lines")));
  unchanged("a skill file", (b) => b.tool("view_file", { AbsolutePath: "/home/user/.gemini/antigravity-cli/skills/example-skill/SKILL.md" }, OK_SIZE));
  unchanged("a cat of two files", (b) => b.tool("run_command", { CommandLine: `cat ${SCHEMA} /work/repo/README.md` }, done("x")));
  unchanged("a cat piped to another command", (b) => b.tool("run_command", { CommandLine: `cat ${SCHEMA} | grep url` }, done("x")));
  unchanged("a grep over the schema folder", (b) => b.tool("grep_search", { Query: "url", SearchPath: "/home/user/.gemini/antigravity-cli/mcp" }, done("x")));
  unchanged("a write to a schema path", (b) => b.tool("write_to_file", { TargetFile: SCHEMA, CodeContent: "{}" }, done(null)));
  unchanged("a path with the schema folder as a prefix of another name", readFile("/home/user/x.gemini/antigravity-cli/mcp/example_server/example_tool.json"));
  unchanged("a nested file below the server folder", readFile("/home/user/.gemini/antigravity-cli/mcp/example_server/sub/example_tool.json"));
  unchanged("a non-json, non-instructions file in the server folder", readFile("/home/user/.gemini/antigravity-cli/mcp/example_server/notes.txt"));

  it.each([
    ["Claude Agent SDK", RuntimeKind.CLAUDE_AGENT_SDK],
    ["Codex App Server", RuntimeKind.CODEX_APP_SERVER],
    ["Grok Build", RuntimeKind.GROK_BUILD],
    ["AutoByteus", RuntimeKind.AUTOBYTEUS],
    ["no runtime recorded", null],
  ] as const)("AC-004: the same schema read on %s is rendered as before", (_label, runtimeKind) => {
    const r = journalOf(runtimeKind, (b) => b.tool("read_file", { Path: SCHEMA }, "contents"));
    expect(r.omittedRecordCount).toBe(0);
    expect(r.renderedRecordCount).toBe(r.records.length);
  });
});
