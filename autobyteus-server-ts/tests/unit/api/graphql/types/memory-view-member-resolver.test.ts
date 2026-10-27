import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../../../../../src/run-history/store/team-run-execution-tree-store.js";
import { AgentOrgCommunicationMessagesStore } from "../../../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { TeamCommunicationStore } from "../../../../../src/services/team-communication/team-communication-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../../fixtures/current-agent-org-run-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../../../fixtures/current-team-run-fixtures.js";

const source = vi.hoisted(() => ({ rootDir: "" }));

vi.mock("../../../../../src/agent-memory/services/memory-explorer-source-service.js", () => ({
  getMemoryExplorerSourceService: () => ({
    resolveSource: async () => ({ source: { type: "LOCAL" }, rootDir: source.rootDir, readOnly: true, option: null }),
  }),
}));

const { MemoryViewResolver } = await import("../../../../../src/api/graphql/types/memory-view.js");
const { getWorkJournalService } = await import("../../../../../src/agent-work-journal/services/work-journal-service.js");

/** A run folder whose raw traces say `fact`, so a view proves which folder it read. */
const writeSemantic = async (runDir: string, fact: string) => {
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, "raw_traces_active.jsonl"),
    `${JSON.stringify({ trace_type: "user", content: fact, ts: 1790056800, turn_id: "t1", seq: 1 })}\n`, "utf8");
};

describe("MemoryViewResolver member run views", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-view-member-"));
    source.rootDir = memoryDir;
    layout = new AgentMemoryLayout(memoryDir);

    const lead = testOrgAgentNode("/delivery/lead", "org-lead-run");
    await new AgentOrgRunExecutionTreeStore().write(layout.getOrgDirPath("org-root"), testAgentOrgExecutionTree({
      orgRunId: "org-root",
      members: [testOrgTeamNode({ address: "/delivery", teamRunId: "org-delivery-team", coordinatorAddress: lead.address, members: [lead] })],
    }));
    // A current root package also carries its communication authority.
    await new AgentOrgCommunicationMessagesStore().write(layout.getOrgDirPath("org-root"), {
      schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-root", messages: [],
    });
    await writeSemantic(path.join(memoryDir, "agent_orgs", "org-root", "org-delivery-team", "org-lead-run"), "org fact");

    const teamDir = layout.getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] });
    await new TeamCommunicationStore().write(teamDir, { schemaVersion: 1, rootTeamRunId: "team-root", messages: [] });
    await new TeamRunExecutionTreeStore().write(
      teamDir,
      testExecutionTree({
        rootTeamRunId: "team-root",
        rootTeamDefinitionId: "team-def",
        coordinatorAddress: "/writer",
        children: [testAgentNode("/writer", { agentRunId: "writer-run" })],
      }),
    );
    await writeSemantic(path.join(memoryDir, "agent_teams", "team-root", "writer-run"), "team fact");
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("reads an org member run's memory through its resolved org location", async () => {
    const view = await new MemoryViewResolver().getAgentOrgMemberRunMemoryView("org-root", "org-lead-run", null, true);
    expect(view.runId).toBe("org-lead-run");
    expect(view.rawTraces?.map((trace) => trace.content)).toEqual(["org fact"]);
  });

  it("returns an empty view for an unknown org member", async () => {
    const view = await new MemoryViewResolver().getAgentOrgMemberRunMemoryView("org-root", "missing-run", null, true, false, false, null, null, {});
    expect(view).toMatchObject({ runId: "missing-run" });
    expect(view.rawTraces ?? null).toBeNull();
    expect(view.workJournal ?? null).toBeNull();
  });

  it("keeps reading team member runs through the shared member view read", async () => {
    const view = await new MemoryViewResolver().getTeamMemberRunMemoryView("team-root", "writer-run", null, true);
    expect(view.runId).toBe("writer-run");
    expect(view.rawTraces?.map((trace) => trace.content)).toEqual(["team fact"]);
  });

  it("reads a member's Work Journal through the journal service, null before the run has one", async () => {
    const resolver = new MemoryViewResolver();
    const before = await resolver.getTeamMemberRunMemoryView("team-root", "writer-run", null, false, false, false, null, null, {});
    expect(before.workJournal).toBeNull();
    const runDir = path.join(memoryDir, "agent_teams", "team-root", "writer-run");
    await getWorkJournalService().ensureCurrent({ runId: "writer-run", memoryDir: runDir, runtimeKind: null });
    const view = await resolver.getTeamMemberRunMemoryView("team-root", "writer-run", null, false, false, false, null, null, { start: 1, end: 2 });
    expect(view.workJournal).toMatchObject({
      files: [{ journalFile: "work_journal_active.md", state: "OPEN", days: [{ day: "2026-09-22", line: 5 }] }],
      selectedFile: "work_journal_active.md", start: 1, end: 2, lines: ["# Work Journal — run writer-run", expect.stringContaining("Runtime")],
    });
  });
});
