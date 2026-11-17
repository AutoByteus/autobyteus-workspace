import { describe, expect, it } from "vitest";
import { readClaudeTaskEnd } from "../../../../../../src/agent-execution/backends/claude/session/claude-background-task-end.js";

// Summary texts as Claude Code 2.1.325 writes them (RIt/HRo in its bundle; investigation notes, Source Log).
const command = (rest: string) => `Background command "npm test -- --runInBand" ${rest}`;

describe("readClaudeTaskEnd (autobyteus-483, REQ-003, RSK-002)", () => {
  it.each([
    ["completed", command("completed (exit code 0)"), null, 0],
    ["completed", command("completed (exit code 0: Shell cwd was reset (to /tmp))"), null, 0],
    ["failed", command("failed with exit code 2"), null, 2],
    ["failed", command("failed with exit code 137"), null, 137],
    ["stopped", command("was stopped after reaching its background time limit"), "time_limit", null],
    ["stopped", command("was stopped because the system is running low on memory"), "low_memory", null],
  ] as const)("reads a %s notification %j", (status, summary, endReason, exitCode) => {
    expect(readClaudeTaskEnd({ status, summary, reason: null })).toEqual({ endReason, exitCode });
  });

  it.each([
    ["stopped", command("was stopped")],
    ["completed", command("completed")],
    ["failed", command("failed")],
    ["completed", 'Agent "Explore the repo" finished'],
    ["stopped", 'Monitor event: "was stopped after reaching its background time limit"'],
    ["stopped", null],
    ["stopped", 'Background command "x" was stopped after reaching its background time limit — retry later'],
    ["completed", command("failed with exit code 1")],
  ] as const)("gives no reason for a %s notification %j (AC-008)", (status, summary) => {
    expect(readClaudeTaskEnd({ status, summary, reason: null })).toEqual({ endReason: null, exitCode: null });
  });

  it("reads a description that itself contains the wording only from the summary's end", () => {
    const summary = 'Background command "echo \\" was stopped after reaching its background time limit" failed with exit code 1';
    expect(readClaudeTaskEnd({ status: "failed", summary, reason: null })).toEqual({ endReason: null, exitCode: 1 });
  });

  it("maps the SDK's worker_restart reason to run_ended", () => {
    expect(readClaudeTaskEnd({ status: "stopped", summary: command("was stopped"), reason: "worker_restart" }))
      .toEqual({ endReason: "run_ended", exitCode: null });
  });
});
