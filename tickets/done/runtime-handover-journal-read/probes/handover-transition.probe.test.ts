// PROBE for autobyteus-583 (temporary; copy kept in the ticket's probes/). Synthetic records only.
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { buildRuntimeSwitch } from "../../src/agent-execution/domain/runtime-switch.js";
import { RuntimeSwitchRecorder } from "../../src/agent-memory/services/runtime-switch-recorder.js";
import { readPendingRuntimeHandover } from "../../src/agent-memory/services/runtime-handover-reader.js";
import { WorkJournalService } from "../../src/agent-work-journal/services/work-journal-service.js";
import { buildRuntimeHandoverNoticeText } from "../../src/runtime-handover-notices/services/runtime-handover-notice-builder.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { appendActive, makeRunDir, makeTempMemoryRoot, turnRecords, writeActive } from "../agent-work-journal/raw-trace-folder-fixtures.js";

const sw = (runDir: string, switchId: string, from: RuntimeKind, to: RuntimeKind) => buildRuntimeSwitch({
  runId: path.basename(runDir), agentDefinitionId: "a", workspaceRootPath: "/w", memoryDir: runDir, llmModelIdentifier: "m-to", llmConfig: null,
  autoExecuteTools: false, runtimeKind: to, platformAgentRunId: null, startedAt: "2026-10-29T09:00:00.000Z",
  pendingRuntimeSwitch: { switchId, from: { runtimeKind: from, llmModelIdentifier: "m-from", llmConfig: null, platformAgentRunId: "s" } },
} as never)!;

const doSwitch = (runDir: string, id: string, from: RuntimeKind, to: RuntimeKind, candidate = true) => {
  const r = new RuntimeSwitchRecorder();
  const theSwitch = sw(runDir, id, from, to);
  const ticket = r.begin(runDir, theSwitch);
  if (candidate) appendActive(runDir, [{ id: `rt_cand_${id}`, ts: 1790099999, trace_type: "system_instruction", content: "You are the new agent.", source_event: "system_instructions_supplied" }]);
  r.record(runDir, ticket);
};

const report = async (label: string, runDir: string, runtimeKind: RuntimeKind) => {
  const journals = new WorkJournalService();
  await journals.ensureCurrent({ runId: path.basename(runDir), memoryDir: runDir, runtimeKind });
  const files = (await journals.listJournalFiles(runDir)) ?? [];
  console.log(`\n===== ${label} =====`);
  console.log("pending:", JSON.stringify(readPendingRuntimeHandover(runDir)));
  console.log("raw files:", fs.readdirSync(runDir).filter((f) => f.startsWith("raw_traces")).join(", "));
  for (const f of files) {
    console.log(`--- ${f.journalFile} (${f.state}, ${f.sizeBytes} B, ${f.lineCount} lines)`);
    const md = fs.readFileSync(path.join(runDir, "work_journal", f.journalFile), "utf8").split("\n");
    console.log(md.length > 14 ? [...md.slice(0, 8), "  …", ...md.slice(-5)].join("\n") : md.join("\n"));
  }
  console.log("--- NOTICE ---\n" + buildRuntimeHandoverNoticeText({ journalFolder: path.join(runDir, "work_journal"), files }));
};

describe("probe 583", () => {
  it("A: normal switch after three turns", async () => {
    const runDir = makeRunDir(makeTempMemoryRoot(), "run_a");
    writeActive(runDir, [...turnRecords("t1", "git status", "clean"), ...turnRecords("t2", "pnpm test", "12 passed"), ...turnRecords("t3", "git diff", "x")]);
    doSwitch(runDir, "s1", RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER);
    await report("A", runDir, RuntimeKind.CODEX_APP_SERVER);
  });
  it("B: second switch with no input in between", async () => {
    const runDir = makeRunDir(makeTempMemoryRoot(), "run_b");
    writeActive(runDir, [...turnRecords("t1", "git status", "clean"), ...turnRecords("t2", "pnpm test", "12 passed")]);
    doSwitch(runDir, "s1", RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER);
    doSwitch(runDir, "s2", RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK);
    await report("B", runDir, RuntimeKind.CLAUDE_AGENT_SDK);
  });
  it("C: long previous era", async () => {
    const runDir = makeRunDir(makeTempMemoryRoot(), "run_c");
    const recs = []; for (let i = 0; i < 1500; i++) recs.push(...turnRecords(`t${i}`, `echo step ${i}`, "x".repeat(300)));
    writeActive(runDir, recs);
    doSwitch(runDir, "s1", RuntimeKind.CLAUDE_AGENT_SDK, RuntimeKind.CODEX_APP_SERVER);
    await report("C", runDir, RuntimeKind.CODEX_APP_SERVER);
  });
});
