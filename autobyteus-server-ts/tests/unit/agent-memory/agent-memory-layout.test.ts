import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { runPartPlacement } from "../../../src/agent-memory/domain/agent-run-memory-placement.js";
import { createRootExecutionPhysicalScope } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

describe("AgentMemoryLayout", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-agent-memory-layout-"));
    layout = new AgentMemoryLayout(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("composes standalone and team memory paths under the canonical roots", () => {
    expect(layout.getStandaloneRootDirPath()).toBe(path.join(memoryDir, "agents"));
    expect(layout.getStandaloneRunDirPath("agent-a")).toBe(path.join(memoryDir, "agents", "agent-a"));
    expect(layout.getTeamRootDirPath()).toBe(path.join(memoryDir, "agent_teams"));
    expect(layout.getTeamAgentRunDirPath(
      { rootTeamRunId: "team-1", ancestorTeamRunIds: ["child-team-1"] },
      "member-a",
    )).toBe(path.join(memoryDir, "agent_teams", "team-1", "child-team-1", "member-a"));
  });

  it("places every agent's memory by one rule (contract L1): a part of its own run, by physical scope", () => {
    const scope = (rootSubjectKind: "agent" | "agent_team" | "agent_org", ancestorTeamRunIds: string[] = []) =>
      createRootExecutionPhysicalScope({ root: { rootSubjectKind, rootRunId: "root-1" }, ancestorTeamRunIds });
    expect(layout.getAgentRunMemoryDirPath(runPartPlacement(scope("agent_team")), "member-a"))
      .toBe(path.join(memoryDir, "agent_teams", "root-1", "member-a"));
    expect(layout.getAgentRunMemoryDirPath(runPartPlacement(scope("agent_org", ["mounted-team"])), "member-a"))
      .toBe(path.join(memoryDir, "agent_orgs", "root-1", "mounted-team", "member-a"));
    // A delegated team run is its own run: its member is at its own team's folder.
    expect(layout.getAgentRunMemoryDirPath(runPartPlacement(createRootExecutionPhysicalScope({
      root: { rootSubjectKind: "agent_team", rootRunId: "task-team-1" }, ancestorTeamRunIds: [] })), "member-b"))
      .toBe(path.join(memoryDir, "agent_teams", "task-team-1", "member-b"));
  });

  it("guards against path traversal in team path segments", () => {
    expect(() => layout.getTeamDirPath({ rootTeamRunId: "../escape", ancestorTeamRunIds: [] })).toThrow("rootTeamRunId is invalid");
    expect(() => layout.getTeamAgentRunDirPath(
      { rootTeamRunId: "team-1", ancestorTeamRunIds: ["../escape"] },
      "member-a",
    )).toThrow("ancestorTeamRunIds[0] is invalid");
  });

  it("names an agent's episodic folder exactly as its semantic folder, under episodic/ (REQ-001)", () => {
    expect(layout.getEpisodicRootDirPath()).toBe(path.join(memoryDir, "episodic"));
    for (const id of ["project-task-manager", "team-local-agent:software-engineering-team:solution-designer"]) {
      expect(path.basename(layout.getAgentEpisodicDirPath(id))).toBe(path.basename(layout.getAgentSemanticMemoryDirPath(id)));
    }
    expect(layout.getAgentEpisodicDirPath("team-local-agent:software-engineering-team:solution-designer"))
      .toBe(path.join(memoryDir, "episodic", "team-local-agent%3Asoftware-engineering-team%3Asolution-designer"));
    expect(() => layout.getAgentEpisodicDirPath("  ")).toThrow("agentDefinitionId is required");
    expect(() => layout.getAgentEpisodicDirPath("..")).toThrow("agentDefinitionId is invalid");
  });

  it("guards against path traversal in standalone run segments", () => {
    expect(() => layout.getStandaloneRunDirPath("../escape")).toThrow("agentRunId is invalid");
    expect(() => layout.getStandaloneRunDirPath("nested/agent")).toThrow("agentRunId is invalid");
  });
});
