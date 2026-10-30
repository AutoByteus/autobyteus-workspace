import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { getRuntimeTranslation } from "../../../src/agent-work-journal/rendering/runtimes/runtime-translation.js";
import { RecordBuilder, entryLines, render } from "../journal-record-fixtures.js";

const ORACLE = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, "../../fixtures/agent-work-journal/work-journal-builtin-tools.json"), "utf8",
)) as Record<string, Record<string, string>>;

/** Entry lines of one call → result, times removed. */
const lines = (runtime: RuntimeKind, name: string, args: Record<string, unknown>, result: unknown, error: string | null = null) => {
  const builder = new RecordBuilder();
  return entryLines(render(runtime, builder.tool(name, args, result, error)).markdown)
    .map((line) => line.replace(/^\[\d\d:\d\d:\d\d\] /, "").replace(/ \[↗\]\([^)]*\)$/, ""));
};

describe("built-in tables match work-journal-builtin-tools.json (contract §4 oracle)", () => {
  for (const runtime of Object.values(RuntimeKind)) {
    it(`${runtime} built-in names equal the oracle`, () => {
      expect([...getRuntimeTranslation(runtime).builtInTools.keys()].sort()).toEqual(Object.keys(ORACLE[runtime]!).sort());
    });
  }

  it("an unknown runtime has no built-ins (every tool uses the generic rule)", () => {
    expect(getRuntimeTranslation(null).builtInTools.size).toBe(0);
    expect(getRuntimeTranslation("future_runtime").label).toBe("unknown");
  });
});

describe("Claude (contract §4, §6)", () => {
  const claude = RuntimeKind.CLAUDE_AGENT_SDK;

  it("Bash: command, background, and an `Exit code <n>` error as the exit with the rest as output", () => {
    expect(lines(claude, "Bash", { command: "ls src", description: "List" }, "a.ts\nb.ts")).toEqual([
      "Command: ls src → ok", "           a.ts", "           b.ts"]);
    expect(lines(claude, "Bash", { command: "npm run dev", run_in_background: "true", timeout: 5 }, "started")[0])
      .toBe("Command: npm run dev (background) → ok");
    expect(lines(claude, "Bash", { command: "git status" }, null, "Exit code 1\nfatal: not a git repository")).toEqual([
      "Command: git status → exit 1", "           fatal: not a git repository"]);
  });

  it("Read: cat -n with offset/limit ranges in the common number layout; images as a media marker", () => {
    expect(lines(claude, "Read", { file_path: "/w/a.ts" }, "1\talpha\n2\tbeta")).toEqual([
      "Command: cat -n /w/a.ts → ok", "                1\talpha", "                2\tbeta"]);
    expect(lines(claude, "Read", { file_path: "/w/a.ts", offset: 735, limit: 15 }, "735\tx")[0])
      .toBe("Command: cat -n /w/a.ts | sed -n '735,749p' → ok");
    expect(lines(claude, "Read", { file_path: "/w/a.ts", offset: 10 }, "10\tx")[0]).toBe("Command: cat -n /w/a.ts | sed -n '10,$p' → ok");
    expect(lines(claude, "Read", { file_path: "/w/a.ts", limit: 5 }, "1\tx")[0]).toBe("Command: cat -n /w/a.ts | sed -n '1,5p' → ok");
    expect(lines(claude, "Read", { file_path: "/w/p.png" },
      [{ type: "image", source: { type: "base64", media_type: "image/png", data: "A".repeat(4000) } }])).toEqual([
      "Command: cat -n /w/p.png → ok", "           [image image/png, 2.9 KB, not reproduced]"]);
  });

  it("Grep: files mode by default, content with -n, count, options and pipes", () => {
    expect(lines(claude, "Grep", { pattern: "N1|N2", path: "/w/r.md", output_mode: "content", head_limit: 20 }, "112:x")[0])
      .toBe("Command: grep -rnE \"N1|N2\" /w/r.md | head -n 20 → ok");
    expect(lines(claude, "Grep", { pattern: "foo" }, "Found 2 files\na.ts\nb.ts")).toEqual([
      "Command: grep -rlE \"foo\" . → ok", "           Found 2 files", "           a.ts", "           b.ts"]);
    expect(lines(claude, "Grep", { pattern: "x", output_mode: "count", "-i": true, glob: "*.{ts,vue}", type: "ts" }, "3")[0])
      .toBe("Command: grep -rcE -i --include=\"*.ts\" --include=\"*.{ts,vue}\" \"x\" . → ok");
    expect(lines(claude, "Grep", { pattern: "x", output_mode: "content", "-n": false, "-C": 2, glob: "!dist/**", offset: 5, multiline: true }, "x")[0])
      .toBe("Command: grep -rE -C 2 --exclude=\"dist/**\" \"x\" . | tail -n +6 (multiline) → ok");
  });

  it("Glob, WebFetch (summarized), WebSearch", () => {
    expect(lines(claude, "Glob", { pattern: "src/**/*.md", path: "/w" }, "/w/src/a.md")[0]).toBe("Command: find /w -path \"src/**/*.md\" → ok");
    expect(lines(claude, "Glob", { pattern: "*.md" }, "")[0]).toBe("Command: find . -path \"*.md\" → ok");
    expect(lines(claude, "WebFetch", { url: "https://x.ai", prompt: "List models", offset: 3 }, "# Summary")).toEqual([
      "Command: curl https://x.ai (summarized: \"List models\") (from offset 3) → ok", "           # Summary"]);
    expect(lines(claude, "WebSearch", { query: "codex skills", mode: "standard" }, "Web search results")).toEqual([
      "Search web: \"codex skills\" → ok", "           Web search results"]);
  });

  it("Write and Edit: confirmations are not shown; diffs are built; replace_all; MultiEdit; NotebookEdit", () => {
    expect(lines(claude, "Write", { file_path: "/w/a.md", content: "# A\nbody\n" },
      "File created successfully at: /w/a.md (file state is current in your context — no need to Read it back)")).toEqual([
      "Write file: /w/a.md (2 lines) → ok", "           # A", "           body"]);
    expect(lines(claude, "Edit", { file_path: "/w/a.md", old_string: "keep\nold", new_string: "keep\nnew", replace_all: false },
      "The file /w/a.md has been updated successfully. (file state is current in your context — no need to Read it back)")).toEqual([
      "Edit file: /w/a.md (+1 −1) → ok", "            keep", "           -old", "           +new"]);
    expect(lines(claude, "Edit", { file_path: "/w/a.md", old_string: "a", new_string: "b", replace_all: true }, "ok")[0])
      .toBe("Edit file: /w/a.md (+1 −1) (all occurrences) → ok");
    expect(lines(claude, "MultiEdit", { file_path: "/w/a.md", edits: [{ old_string: "a", new_string: "b" }, { old_string: "c", new_string: "d" }] }, "ok"))
      .toEqual(["Edit file: /w/a.md (+2 −2) → ok", "           -a", "           +b", "           …", "           -c", "           +d"]);
    expect(lines(claude, "NotebookEdit", { notebook_path: "/w/n.ipynb", cell_id: "c3", new_source: "print(1)" }, "ok")).toEqual([
      "Edit file: /w/n.ipynb (+1 −0) (notebook cell c3) → ok", "           +print(1)"]);
  });

  it("§6: tool_use_error tags, the user's rejection, and the persisted-output wrapper", () => {
    expect(lines(claude, "Edit", { file_path: "/w/a", old_string: "a", new_string: "b" }, null,
      "<tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>")[0])
      .toBe("Edit file: /w/a (+1 −1) → failed: File has not been read yet. Read it first before writing to it.");
    expect(lines(claude, "Grep", { pattern: "x" }, null,
      "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed."))
      .toEqual(["Command: grep -rlE \"x\" . → rejected by the user"]);
    expect(lines(claude, "Bash", { command: "cat big" },
      "<persisted-output>\nOutput too large (26.5KB). Full output saved to: /tmp/tool-results/b.txt\n\nPreview (first 2KB):\nline one\nline two\n...\n</persisted-output>"))
      .toEqual([
        "Command: cat big → ok",
        "           line one",
        "           line two",
        "           …[full output (26.5KB) was saved outside the raw trace: /tmp/tool-results/b.txt]",
      ]);
  });

  it("a Claude non-built-in (Skill, TodoWrite) uses the generic rule", () => {
    expect(lines(claude, "Skill", { skill: "implementation-engineer" }, "Launching skill")).toEqual([
      "Tool: Skill skill=\"implementation-engineer\" → ok", "           Launching skill"]);
  });
});

describe("Codex (contract §4)", () => {
  const codex = RuntimeKind.CODEX_APP_SERVER;

  it("run_bash: shell wrapper removed, cwd, no exit code; a failure's output is the error text", () => {
    expect(lines(codex, "run_bash", { command: "/bin/bash -lc 'cat '\\''a b'\\'''", cwd: "/w" }, "x")[0])
      .toBe("Command: cat 'a b' (in /w) → ok");
    expect(lines(codex, "run_bash", { command: "/bin/zsh -lc \"echo \\\"hi\\\"\"" }, "hi")[0]).toBe("Command: echo \"hi\" → ok");
    expect(lines(codex, "run_bash", { command: "bash -lc 'false'" }, null, "fatal: ambiguous argument\nusage: git")).toEqual([
      "Command: false → failed", "           fatal: ambiguous argument", "           usage: git"]);
    expect(lines(codex, "run_bash", {}, "x")[0]).toBe("Command: (command not recorded) → ok");
  });

  it("edit_file: hunks are an edit, no hunks a new file, path only is not recorded", () => {
    expect(lines(codex, "edit_file", { path: "/w/r.md", patch: "@@ -66,2 +66,2 @@\n ## Rule\n-Pending\n+Fresh" }, { success: true })).toEqual([
      "Edit file: /w/r.md (+1 −1) → ok", "            ## Rule", "           -Pending", "           +Fresh"]);
    expect(lines(codex, "edit_file", { path: "/w/n.md", patch: "# Title\nbody" }, { success: true })).toEqual([
      "Write file: /w/n.md (2 lines) → ok", "           # Title", "           body"]);
    expect(lines(codex, "edit_file", { path: "/w/x.ts" }, null, "Tool execution failed.")[0])
      .toBe("Edit file: /w/x.ts (change not recorded) → failed: Tool execution failed.");
  });

  it("search_web: query from the call or the result; openPage and findInPage; no results recorded", () => {
    expect(lines(codex, "search_web", { query: "codex skills", action_type: "search" }, { status: "completed" }))
      .toEqual(["Search web: \"codex skills\" → ok (results not recorded)"]);
    expect(lines(codex, "search_web", {}, { status: "completed", query: "from result", action_type: "search" }))
      .toEqual(["Search web: \"from result\" → ok (results not recorded)"]);
    expect(lines(codex, "search_web", { query: "q", queries: ["q1", "q2"], action_type: "search" }, { status: "completed" }))
      .toEqual(["Search web: \"q1\", \"q2\" → ok (results not recorded)"]);
    expect(lines(codex, "search_web", { query: "https://github.com/a/b", action_type: "openPage" }, { status: "completed" }))
      .toEqual(["Command: curl https://github.com/a/b → ok (page content not recorded)"]);
    expect(lines(codex, "search_web", { action_type: "openPage" }, { status: "completed", action_type: "openPage" }))
      .toEqual(["Command: curl (URL not recorded) → ok (page content not recorded)"]);
    expect(lines(codex, "search_web", { action_type: "findInPage", pattern: "token", url: "https://a.b" }, { status: "completed" }))
      .toEqual(["Search web: find \"token\" in https://a.b → ok (results not recorded)"]);
  });

  it("Codex-qualified MCP names and MCP envelopes use the generic rule", () => {
    expect(lines(codex, "plugin_management.search_plugins", { query: "x" },
      { content: [{ type: "text", text: "found 2" }], structuredContent: null, isError: false, _meta: null }))
      .toEqual(["Tool: plugin_management.search_plugins query=\"x\" → ok", "           found 2"]);
  });
});

describe("Antigravity (contract §4, §6)", () => {
  const agy = RuntimeKind.ANTIGRAVITY_CLI;
  const done = (output: unknown) => ({ provider_state: "DONE", output });

  it("run_command: Cwd, background, AGY notes not shown, truncation and CRLF", () => {
    expect(lines(agy, "run_command", { CommandLine: "ls -lh /w", Cwd: "/w", WaitMsBeforeAsync: 0, toolAction: "x", toolSummary: "y" },
      done("<truncated 3 lines>\r\ntotal 3\r\nREADME.md"))).toEqual([
      "Command: ls -lh /w (in /w) → ok", "           …[3 lines not recorded]", "           total 3", "           README.md"]);
    expect(lines(agy, "run_command", { CommandLine: "pnpm dev", IsDaemon: true }, null, "Tool execution interrupted."))
      .toEqual(["Command: pnpm dev (background) → interrupted"]);
  });

  it("view_file: usually records only the size; ranges and byte offsets", () => {
    expect(lines(agy, "view_file", { AbsolutePath: "/w/a.json" }, done("1 lines, 2305 bytes")))
      .toEqual(["Command: cat /w/a.json → ok (content not recorded: 1 lines, 2305 bytes)"]);
    expect(lines(agy, "view_file", { AbsolutePath: "/w/a.md", StartLine: 3, EndLine: 9, ContentOffset: 40 }, done("text"))[0])
      .toBe("Command: sed -n '3,9p' /w/a.md (from byte 40) → ok");
  });

  it("grep_search, find_by_name and list_dir", () => {
    expect(lines(agy, "grep_search", { Query: "dept", SearchPath: "/w", Includes: "!.git/**", MatchPerLine: true }, done("a.md:dept"))[0])
      .toBe("Command: grep -r -F --exclude=\".git/**\" \"dept\" /w → ok");
    expect(lines(agy, "grep_search", { Query: "a.+b", SearchPath: "/w", IsRegex: true, CaseInsensitive: true, Includes: ["*.ts"] }, done(null))[0])
      .toBe("Command: grep -r -i -E --include=\"*.ts\" \"a.+b\" /w → ok");
    expect(lines(agy, "find_by_name", { Pattern: "*template*", SearchDirectory: "/w", Type: "file", Excludes: ["node_modules"] }, done(null)))
      .toEqual(["Command: find /w -name \"*template*\" -type f -not -name \"node_modules\" → ok"]);
    expect(lines(agy, "find_by_name", { SearchDirectory: "/w", Extensions: ["ts", "md"] }, done(null))[0])
      .toBe("Command: find /w \\( -name \"*.ts\" -o -name \"*.md\" \\) → ok");
    expect(lines(agy, "list_dir", { DirectoryPath: "/w/skills" }, done("a/\nb/"))).toEqual([
      "Command: ls -p /w/skills → ok", "           a/", "           b/"]);
    expect(lines(agy, "list_dir", { DirectoryPath: "/w/none" }, { provider_state: "ERROR", output: null }, "directory /w/none does not exist")[0])
      .toBe("Command: ls -p /w/none → failed: directory /w/none does not exist");
  });

  it("write_to_file and replace_file_content, including older records without content", () => {
    expect(lines(agy, "write_to_file", { TargetFile: "/w/t.md", CodeContent: "# T", Description: "d", Overwrite: true, Append: true }, done(null)))
      .toEqual(["Write file: /w/t.md (1 lines) (append) → ok", "           # T"]);
    expect(lines(agy, "write_to_file", { TargetFile: "/w/t.md" }, done(null))).toEqual(["Write file: /w/t.md (content not recorded) → ok"]);
    expect(lines(agy, "replace_file_content", { TargetFile: "/w/r.md", TargetContent: "- a\n  - b", ReplacementContent: "- a\n  - c\n  - d",
      Instruction: "i", AllowMultiple: false, StartLine: 1, EndLine: 2 }, done(null))).toEqual([
      "Edit file: /w/r.md (+2 −1) → ok", "            - a", "           -  - b", "           +  - c", "           +  - d"]);
    expect(lines(agy, "replace_file_content", { TargetFile: "/w/r.md" }, done(null))).toEqual(["Edit file: /w/r.md (change not recorded) → ok"]);
  });

  it("older call_mcp_tool records are unwrapped, then use the generic rule; denied envelopes", () => {
    expect(lines(agy, "call_mcp_tool", { ServerName: "autobyteus_agent_tools", ToolName: "get_handoff_rules", Arguments: {} },
      done("{\"handoffs\":[]}"))).toEqual(["Tool: get_handoff_rules → ok", "           {\"handoffs\":[]}"]);
    expect(lines(agy, "manage_task", { action: "list", toolAction: "x" }, { provider_state: "DONE", output: null, status: "denied", reason: "policy" }))
      .toEqual(["Tool: manage_task action=\"list\" → denied: policy"]);
  });
});

describe("Grok Build (contract §4)", () => {
  const grok = RuntimeKind.GROK_BUILD;

  it("run_bash with an `Exit code: <n>` error", () => {
    expect(lines(grok, "run_bash", { command: "make test", cwd: "/w" }, null, "1 failing\nExit code: 2")).toEqual([
      "Command: make test (in /w) → exit 2", "           1 failing"]);
  });

  it("read_file: cat, or cat -n when the output is numbered", () => {
    expect(lines(grok, "read_file", { path: "/w/a.ts" }, "alpha\nbeta")[0]).toBe("Command: cat /w/a.ts → ok");
    expect(lines(grok, "read_file", { path: "/w/a.ts", offset: 2, limit: 2 }, "2\tbeta\n3\tgamma")).toEqual([
      "Command: cat -n /w/a.ts | sed -n '2,3p' → ok", "                2\tbeta", "                3\tgamma"]);
  });

  it("grep defaults to content mode; list_dir, web_fetch, write, edit and web_search", () => {
    expect(lines(grok, "grep", { pattern: "prototyper", path: null, glob: "**/*.{json,md}", "-i": false, type: null, head_limit: 40, multiline: false },
      "found 13 matches")).toEqual([
      "Command: grep -rnE --include=\"**/*.{json,md}\" \"prototyper\" . | head -n 40 → ok", "           found 13 matches"]);
    expect(lines(grok, "list_dir", { target_directory: "/w" }, "├── a")[0]).toBe("Command: ls /w → ok");
    expect(lines(grok, "web_fetch", { url: "https://x.ai" }, "page")[0]).toBe("Command: curl https://x.ai → ok");
    expect(lines(grok, "write_file", { file_path: "/w/a", content: "x" }, "written")).toEqual(["Write file: /w/a (1 lines) → ok", "           x"]);
    expect(lines(grok, "edit_file", { file_path: "/w/a", old_string: "x", new_string: "y" }, "edited")[0]).toBe("Edit file: /w/a (+1 −1) → ok");
    expect(lines(grok, "web_search", { query: "grok" }, "results")[0]).toBe("Search web: \"grok\" → ok");
    expect(lines(grok, "search_tool", { query: "send", limit: 5 }, "{\"results\":[]}")[0]).toBe("Tool: search_tool query=\"send\" limit=5 → ok");
  });
});

describe("AutoByteus (contract §4, §6)", () => {
  const autobyteus = RuntimeKind.AUTOBYTEUS;

  it("run_bash: exitCode, timedOut, stdout then stderr", () => {
    expect(lines(autobyteus, "run_bash", { command: "pwd && ls", cwd: "/w", timeout_seconds: 30 },
      { exitCode: 0, effectiveCwd: "/w", stdout: "/w\nfile\n", stderr: "warn\n", timedOut: false })).toEqual([
      "Command: pwd && ls (in /w) → exit 0", "           /w", "           file", "           stderr:", "           warn"]);
    expect(lines(autobyteus, "run_bash", { command: "sleep 99" }, { exitCode: null, timedOut: true, stdout: "" }))
      .toEqual(["Command: sleep 99 → timed out"]);
  });

  it("start_background_process, read_file (numbered and not, and media), read_media_file (recorded history), read_url", () => {
    expect(lines(autobyteus, "start_background_process", { command: "npm run dev", cwd: "/w" }, { pid: 11240, status: "running" }))
      .toEqual(["Command: npm run dev (in /w) (background) → started pid 11240"]);
    expect(lines(autobyteus, "read_file", { path: "/w/SKILL.md" }, "1: ---\n2: name: x")).toEqual([
      "Command: cat -n /w/SKILL.md → ok", "                1\t---", "                2\tname: x"]);
    expect(lines(autobyteus, "read_file", { path: "/w/a", start_line: 5, end_line: 6, include_line_numbers: false }, "e\nf")[0])
      .toBe("Command: sed -n '5,6p' /w/a → ok");
    // read_file on an image, audio or video file records a context file (autobyteus-328): the media marker, no numbering.
    expect(lines(autobyteus, "read_file", { path: "/w/p.png" }, { uri: "/w/p.png", fileType: "image", fileName: "p.png" }))
      .toEqual(["Command: cat /w/p.png → ok", "           [image, not reproduced]"]);
    expect(lines(autobyteus, "read_file", { path: "/w/v.wav" }, { uri: "/w/v.wav", fileType: "audio" }))
      .toEqual(["Command: cat /w/v.wav → ok", "           [audio, not reproduced]"]);
    expect(lines(autobyteus, "read_file", { path: "/w/p.png" }, null,
      "The selected model does not support image input. The image file was not loaded.")[0])
      .toBe("Command: cat -n /w/p.png → failed: The selected model does not support image input. The image file was not loaded.");
    // Recorded history: runs from before autobyteus-328 keep their read_media_file calls.
    expect(lines(autobyteus, "read_media_file", { file_path: "/w/p.png" }, { uri: "/w/p.png", fileType: "image" })).toEqual([
      "Command: cat /w/p.png → ok", "           [image, not reproduced]"]);
    expect(lines(autobyteus, "read_url", { url: "https://a.b", output_format: "text" }, "page")[0]).toBe("Command: curl https://a.b → ok");
  });

  it("write_file and edit_file join base_dir; search_web; the error prefix is removed", () => {
    expect(lines(autobyteus, "write_file", { path: "out/a.py", base_dir: "/w", content: "x = 1" }, "File created/updated")[0])
      .toBe("Write file: /w/out/a.py (1 lines) → ok");
    expect(lines(autobyteus, "edit_file", { path: "/w/m.md", patch: "@@\n ctx\n+added" }, "ok")).toEqual([
      "Edit file: /w/m.md (+1 −0) → ok", "            ctx", "           +added"]);
    expect(lines(autobyteus, "search_web", { query: "q", num_results: 5 }, null,
      "Error executing tool 'search_web' (ID: call_00_x): SecretVaultError: SECRET_NOT_FOUND")[0])
      .toBe("Search web: \"q\" → failed: SecretVaultError: SECRET_NOT_FOUND");
    expect(lines(autobyteus, "read_file", { path: "/" }, null,
      "Error executing tool 'read_file' (ID: call_00_y): Error: Could not read file at /: EISDIR")[0])
      .toBe("Command: cat -n / → failed: Could not read file at /: EISDIR");
    expect(lines(autobyteus, "run_bash", { command: "x" }, null, "user_interrupt")).toEqual(["Command: x → interrupted"]);
  });

  it("get_process_output and download_media use the generic rule", () => {
    expect(lines(autobyteus, "get_process_output", { process_id: "p1" }, "log")[0]).toBe("Tool: get_process_output process_id=\"p1\" → ok");
  });
});
