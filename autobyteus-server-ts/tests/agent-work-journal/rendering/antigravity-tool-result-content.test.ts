import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RecordBuilder, entryLines, render } from "../journal-record-fixtures.js";

/**
 * autobyteus-377: Antigravity tool results that now hold the real content. The journal drops the CLI's timestamp header (the raw
 * trace keeps it), shows a read as `cat -n` lines without the CLI's wrapper lines, and keeps the size-only form for older records.
 * Synthetic paths and contents only (TESTING.md: never copy a user's record).
 */
const agy = RuntimeKind.ANTIGRAVITY_CLI;
const done = (output: unknown) => ({ provider_state: "DONE", output });
const HEADER = "Created At: 2026-01-02T03:04:05+00:00\nCompleted At: 2026-01-02T03:04:06+00:00\n";
const lines = (name: string, args: Record<string, unknown>, result: unknown, error: string | null = null) => {
  const b = new RecordBuilder();
  const call = b.call(name, args);
  return entryLines(render(agy, [call, b.result(call, result, error)]).markdown)
    .map((line) => line.replace(/^\[\d\d:\d\d:\d\d\] /, "").replace(/ \[↗\]\([^)]*\)$/, "").replace(/\[raw#[^\]]*\]\([^)]*\)/g, "raw#…"));
};
const cat = (n: number, text: string) => `           ${String(n).padStart(6)}\t${text}`;

describe("a read with its content (AC-008, AC-009: the size-only record is unchanged)", () => {
  it("a ranged read: no timestamps, no wrapper line, the lines as cat -n", () => {
    expect(lines("read_file", { Path: "/w/a.txt", StartLine: 5, EndLine: 7 },
      done(`${HEADER}Showing lines 5-7 of 40\n5: five\n6: six\n7: `))).toEqual([
      "Command: sed -n '5,7p' /w/a.txt → ok", cat(5, "five"), cat(6, "six"), cat(7, "")]);
  });

  it("a whole-file read in the older shape: wrapper lines and the line-number sentence are dropped; a repeated header too", () => {
    const text = `${HEADER}${HEADER}File Path: \`file:///w/a.txt\`\nTotal Lines: 2\nTotal Bytes: 14\nShowing lines 1-2 of 2\nThe following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n1: alpha\n2: beta`;
    expect(lines("view_file", { AbsolutePath: "/w/a.txt" }, done(text))).toEqual([
      "Command: cat /w/a.txt → ok", cat(1, "alpha"), cat(2, "beta")]);
  });

  it("CRLF line endings, and a file whose own text looks like a header or a wrapper line, are not mangled", () => {
    expect(lines("read_file", { Path: "/w/a.txt" }, done(`${HEADER}Showing lines 1-3 of 3\n1: Showing lines of text\n2: Created At: x\n3: Total Lines: 9\n`.replace(/\n/g, "\r\n"))))
      .toEqual(["Command: cat /w/a.txt → ok", cat(1, "Showing lines of text"), cat(2, "Created At: x"), cat(3, "Total Lines: 9")]);
  });

  it("a line that is not numbered stays as recorded; the recorded size-only forms and a failed read are unchanged", () => {
    expect(lines("read_file", { Path: "/w/a.txt" }, done("Showing lines 1-1 of 1\nplain text\n")).slice(1)).toEqual(["           plain text"]);
    expect(lines("read_file", { Path: "/w/a.json" }, done("1 lines, 2305 bytes"))).toEqual(
      ["Command: cat /w/a.json → ok (content not recorded: 1 lines, 2305 bytes)"]);
    expect(lines("read_file", { Path: "/w/missing.md" }, { provider_state: "ERROR", output: null }, "open /w/missing.md: no such file")[0])
      .toBe("Command: cat /w/missing.md → failed: open /w/missing.md: no such file");
  });

  it("a skill file read is still a skill load", () => {
    expect(lines("read_file", { Path: "/home/user/.gemini/antigravity-cli/skills/example-skill/SKILL.md" }, done(`${HEADER}1: ---`)))
      .toEqual(["Load skill: example-skill → ok"]);
  });
});

describe("the timestamp header is not output (AC-010)", () => {
  it("grep_search and find_by_name results show their text without the header", () => {
    expect(lines("grep_search", { Query: "needle", SearchPath: "/w" }, done(`${HEADER}/w/a.txt:needle one\n/w/b.txt:needle two`))).toEqual([
      'Command: grep -r -F "needle" /w → ok', "           /w/a.txt:needle one", "           /w/b.txt:needle two"]);
    expect(lines("find_by_name", { SearchDirectory: "/w", Pattern: "*.md" }, done(`${HEADER}/w/README.md`))).toEqual([
      'Command: find /w -name "*.md" → ok', "           /w/README.md"]);
  });

  it("run_command output loses the header too; text that only mentions it, or has it mid-text, is kept", () => {
    expect(lines("run_command", { CommandLine: "echo hi" }, done(`${HEADER}hi`))).toEqual(["Command: echo hi → ok", "           hi"]);
    expect(lines("run_command", { CommandLine: "echo hi" }, done("log\nCreated At: x\nrest")).join("\n")).toContain("Created At: x");
    expect(lines("run_command", { CommandLine: "echo hi" }, done("Created At: x but not a header line pair")).join("\n")).toBe(
      "Command: echo hi → ok\n           Created At: x but not a header line pair");
  });

  it("a spilled output's preview loses the header; the marker stays", () => {
    const spill = "/home/user/.gemini/antigravity-cli/brain/abc/.system_generated/steps/12/output.txt";
    const text = `The tool's output was truncated due to being too long. You can find the full output in a file at file://${spill}\n\nHere is a preview with the middle of the output truncated:\n${HEADER}a\nb`;
    expect(lines("run_command", { CommandLine: "ls" }, done(text))).toEqual([
      "Command: ls → ok", "           a", "           b", `           …[full output was saved outside the raw trace: ${spill}]`]);
  });
});

describe("write and edit results (AC-010 of SR-001; see D-7 for SR-002)", () => {
  it("a recovered 'Created file.' or edit confirmation does not add output to the write and edit lines", () => {
    const written = lines("write_to_file", { TargetFile: "/w/new.txt", CodeContent: "one\ntwo\n" }, done(`${HEADER}Created file.`));
    expect(written).toEqual(lines("write_to_file", { TargetFile: "/w/new.txt", CodeContent: "one\ntwo\n" }, done(null)));
    const edited = lines("replace_file_content", { TargetFile: "/w/a.txt", TargetContent: "a\n", ReplacementContent: "b\n" },
      done(`${HEADER}Made 1 replacements in /w/a.txt starting at line 1`));
    expect(edited).toEqual(lines("replace_file_content", { TargetFile: "/w/a.txt", TargetContent: "a\n", ReplacementContent: "b\n" }, done(null)));
  });
});
