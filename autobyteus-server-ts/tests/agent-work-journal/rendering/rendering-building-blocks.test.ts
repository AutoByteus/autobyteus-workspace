import { describe, expect, it } from "vitest";
import { shellQuoted, shellWord, toCatNumberedLines } from "../../../src/agent-work-journal/rendering/command-text.js";
import { diffTexts, readPatch } from "../../../src/agent-work-journal/rendering/text-diff.js";
import { cutLongLine, splitLines } from "../../../src/agent-work-journal/rendering/output-shortener.js";
import { formatOutcome } from "../../../src/agent-work-journal/rendering/tool-outcome.js";
import { mediaMarker, normalizeRecordedResult } from "../../../src/agent-work-journal/rendering/result-envelopes.js";
import { parseTeammateMessage } from "../../../src/agent-work-journal/rendering/teammate-message-envelope.js";

describe("command text", () => {
  it("quotes words and patterns as they would be typed", () => {
    expect(shellWord("src/a.ts")).toBe("src/a.ts");
    expect(shellWord("a b's")).toBe("'a b'\\''s'");
    expect(shellQuoted("a\"$`b")).toBe("\"a\\\"\\$\\`b\"");
    expect(shellQuoted("\\d+\\\\")).toBe("\"\\d+\\\\\\\\\"");
  });

  it("numbered lines are recognised only when every non-empty line is numbered", () => {
    expect(toCatNumberedLines(["1\ta", "", "2\tb"])).toEqual(["     1\ta", "", "     2\tb"]);
    expect(toCatNumberedLines(["1: a", "2:"])).toEqual(["     1\ta", "     2\t"]);
    expect(toCatNumberedLines(["1\ta", "plain"])).toBeNull();
  });
});

describe("diffs", () => {
  it("keeps the snippet's shared lines as context and counts changes", () => {
    expect(diffTexts("a\nb\nc\nd", "a\nB\nc\nd\ne")).toEqual({ lines: [" a", "-b", "+B", " c", " d", "+e"], added: 2, removed: 1 });
    expect(diffTexts("", "x\ny")).toEqual({ lines: ["+x", "+y"], added: 2, removed: 0 });
  });

  it("a recorded patch drops file headers and the first hunk header", () => {
    expect(readPatch("--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n@@ -9 +9 @@\n c\n+d")).toEqual({
      lines: ["-a", "+b", "…", " c", "+d"], added: 2, removed: 1, hasHunks: true,
    });
    expect(readPatch("plain\ntext").hasHunks).toBe(false);
  });
});

describe("lines, outcomes and envelopes", () => {
  it("splits lines without a trailing empty line and cuts long lines by character", () => {
    expect(splitLines("a\r\nb\n")).toEqual(["a", "b"]);
    expect(splitLines("")).toEqual([]);
    expect(cutLongLine("😀😀😀", 2)).toBe("😀😀…[+1 chars]");
  });

  it("a long or multi-line error is shown as output, a short one inline", () => {
    expect(formatOutcome({ kind: "failed", error: "boom" })).toEqual({ text: "failed: boom", errorOutput: null });
    expect(formatOutcome({ kind: "failed", error: "a\nb" })).toEqual({ text: "failed", errorOutput: "a\nb" });
    expect(formatOutcome({ kind: "failed", error: "x".repeat(201) }).text).toBe("failed");
  });

  it("result envelopes: AGY failed and denied, MCP isError and structuredContent", () => {
    expect(normalizeRecordedResult({ value: { provider_state: "ERROR", output: "bad" }, error: null }))
      .toEqual({ outcome: { kind: "failed", error: null }, output: "bad" });
    expect(normalizeRecordedResult({ value: { provider_state: "SUCCESS", status: "denied", reason: "policy" }, error: null }).outcome)
      .toEqual({ kind: "denied", reason: "policy" });
    expect(normalizeRecordedResult({ value: { content: [{ type: "text", text: "no" }], isError: true }, error: null }))
      .toEqual({ outcome: { kind: "failed", error: null }, output: "no" });
    expect(normalizeRecordedResult({ value: { content: [], structuredContent: { a: 1 } }, error: null }).output).toBe("{\"a\":1}");
    expect(mediaMarker("image", null, null)).toBe("[image, not reproduced]");
  });

  it("an ordinary user message is not a teammate envelope", () => {
    expect(parseTeammateMessage("You received a message from my boss")).toBeNull();
  });
});
