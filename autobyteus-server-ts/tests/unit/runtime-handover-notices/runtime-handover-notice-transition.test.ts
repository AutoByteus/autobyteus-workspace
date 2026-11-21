import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRuntimeSwitch } from "../../../src/agent-execution/domain/runtime-switch.js";
import type { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { RuntimeSwitchRecorder } from "../../../src/agent-memory/services/runtime-switch-recorder.js";
import { readPendingRuntimeHandover } from "../../../src/agent-memory/services/runtime-handover-reader.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { RuntimeHandoverNoticeService } from "../../../src/runtime-handover-notices/services/runtime-handover-notice-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { makeRunDir, makeTempMemoryRoot, turnRecords, writeActive } from "../../agent-work-journal/raw-trace-folder-fixtures.js";

/**
 * The hand-over notice on a real switch rotation (autobyteus-583, AC-001, AC-002, AC-004): the real switch recorder archives
 * the previous agent's records and starts the new file with the marker, the real pending reader finds the marker, and the real
 * notice service builds the text from the real journal. Synthetic records only (the ticket's PRB-001 cases A and B).
 */
const switchRuntime = (runDir: string, switchId: string, from: RuntimeKind, to: RuntimeKind): void => {
  const theSwitch = buildRuntimeSwitch({
    runId: path.basename(runDir), agentDefinitionId: "a", workspaceRootPath: "/w", memoryDir: runDir, llmModelIdentifier: "m-to", llmConfig: null,
    autoExecuteTools: false, runtimeKind: to, platformAgentRunId: null, startedAt: "2026-10-29T09:00:00.000Z",
    pendingRuntimeSwitch: { switchId, from: { runtimeKind: from, llmModelIdentifier: "m-from", llmConfig: null, platformAgentRunId: "s" } },
  } as never)!;
  const recorder = new RuntimeSwitchRecorder();
  recorder.record(runDir, recorder.begin(runDir, theSwitch));
};

/** The notice the next input after the switch carries. */
const noticeOf = async (runDir: string, runtimeKind: RuntimeKind): Promise<string> => {
  const notices = new RuntimeHandoverNoticeService({ journals: new WorkJournalService(), readPending: readPendingRuntimeHandover });
  const run = { runId: path.basename(runDir), runtimeKind, config: { memoryDir: runDir } } as unknown as AgentRun;
  const preface = await notices.takePreface(run, { dispatchKind: "start_turn" });
  expect(preface, "a hand-over is pending after the switch").not.toBeNull();
  return preface!.text;
};
const journalText = (runDir: string, file: string) => fs.readFileSync(path.join(runDir, "work_journal", file), "utf8");

describe("the hand-over notice on a real switch rotation (autobyteus-583)", () => {
  it("names the closed file with the previous agent's work, not the open file that holds only the hand-over (AC-001)", async () => {
    const runDir = makeRunDir(makeTempMemoryRoot(), "run_a");
    writeActive(runDir, [...turnRecords("t1", "git status", "clean"), ...turnRecords("t2", "pnpm test", "12 passed"), ...turnRecords("t3", "git diff", "x")]);
    switchRuntime(runDir, "s1", RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER);

    const text = await noticeOf(runDir, RuntimeKind.CODEX_APP_SERVER);
    const dir = path.join(runDir, "work_journal");
    expect(text).toContain("The previous agent's most recent work is in work_journal_000001.md.");
    expect(text).toContain(`Before you reply or continue the work, read ${dir}/work_journal_000001.md completely, from its first line to its last.`);
    expect(text).toContain("work_journal_active.md starts with this hand-over");
    // The named file holds the previous agent's work; the open file holds the switch notice and no work.
    expect(journalText(runDir, "work_journal_000001.md")).toContain("git diff");
    expect(journalText(runDir, "work_journal_active.md")).not.toContain("git");
  });

  it("skips the notice-only file a second switch before any input leaves behind (AC-002)", async () => {
    const runDir = makeRunDir(makeTempMemoryRoot(), "run_b");
    writeActive(runDir, [...turnRecords("t1", "git status", "clean"), ...turnRecords("t2", "pnpm test", "12 passed")]);
    switchRuntime(runDir, "s1", RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER);
    switchRuntime(runDir, "s2", RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK);

    const text = await noticeOf(runDir, RuntimeKind.CLAUDE_AGENT_SDK);
    expect(text).toContain("  work_journal_000002.md |");
    expect(text).toContain("The previous agent's most recent work is in work_journal_000001.md.");
    expect(text).not.toContain("read " + path.join(runDir, "work_journal", "work_journal_000002.md"));
    expect(journalText(runDir, "work_journal_000002.md")).not.toContain("git");
  });

  it("has no read instruction after a switch before any work (AC-004)", async () => {
    const runDir = makeRunDir(makeTempMemoryRoot(), "run_c");
    writeActive(runDir, []);
    switchRuntime(runDir, "s1", RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER);

    const text = await noticeOf(runDir, RuntimeKind.CODEX_APP_SERVER);
    expect(text).toContain("[System: runtime hand-over]");
    expect(text).not.toMatch(/completely|most recent work/);
    expect(text).toContain("  work_journal_active.md |");
  });
});
