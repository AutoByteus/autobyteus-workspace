import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentMemoryLayout } from "../../../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgRunExecutionTreeStore } from "../../../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../../../../../src/run-history/store/team-run-execution-tree-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../../fixtures/current-agent-org-run-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../../../fixtures/current-team-run-fixtures.js";

const source = vi.hoisted(() => ({ rootDir: "" }));

vi.mock("../../../../../src/agent-memory/services/memory-explorer-source-service.js", () => ({
  getMemoryExplorerSourceService: () => ({
    resolveSource: async () => ({ source: { type: "LOCAL" }, rootDir: source.rootDir, readOnly: true, option: null }),
  }),
}));

const { MemoryViewResolver } = await import("../../../../../src/api/graphql/types/memory-view.js");

const writeSemantic = async (runDir: string, fact: string) => {
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, "semantic.jsonl"), `${JSON.stringify({ id: fact, fact })}\n`, "utf8");
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
    await writeSemantic(path.join(memoryDir, "agent_orgs", "org-root", "org-delivery-team", "org-lead-run"), "org fact");

    await new TeamRunExecutionTreeStore().write(
      layout.getTeamDirPath({ rootTeamRunId: "team-root", ancestorTeamRunIds: [] }),
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
    const view = await new MemoryViewResolver().getAgentOrgMemberRunMemoryView("org-root", "org-lead-run");
    expect(view.runId).toBe("org-lead-run");
    expect(view.semantic).toEqual([expect.objectContaining({ fact: "org fact" })]);
  });

  it("returns an empty view for an unknown org member", async () => {
    const view = await new MemoryViewResolver().getAgentOrgMemberRunMemoryView("org-root", "missing-run");
    expect(view).toMatchObject({ runId: "missing-run" });
    expect(view.semantic ?? null).toBeNull();
  });

  it("keeps reading team member runs through the shared member view read", async () => {
    const view = await new MemoryViewResolver().getTeamMemberRunMemoryView("team-root", "writer-run");
    expect(view.runId).toBe("writer-run");
    expect(view.semantic).toEqual([expect.objectContaining({ fact: "team fact" })]);
  });
});
