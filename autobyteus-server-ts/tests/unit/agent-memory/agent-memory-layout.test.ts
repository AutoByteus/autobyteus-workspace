import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";

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
      { rootTeamRunId: "team-1", teamRunPath: ["child-team-1"] },
      "member-a",
    )).toBe(path.join(memoryDir, "agent_teams", "team-1", "child-team-1", "member-a"));
  });

  it("creates standalone and hierarchical team-agent subtrees under canonical directories", async () => {
    await layout.ensureStandaloneRunSubtree("agent-a");
    await layout.ensureTeamAgentRunSubtree(
      { rootTeamRunId: "team-1", teamRunPath: ["child-team-1"] },
      "member-a",
    );

    expect((await fs.stat(layout.getStandaloneRunDirPath("agent-a"))).isDirectory()).toBe(true);
    expect((await fs.stat(
      layout.getTeamAgentRunDirPath(
        { rootTeamRunId: "team-1", teamRunPath: ["child-team-1"] },
        "member-a",
      ),
    )).isDirectory()).toBe(true);
  });

  it("guards against path traversal in team path segments", () => {
    expect(() => layout.getTeamDirPath({ rootTeamRunId: "../escape", teamRunPath: [] })).toThrow("rootTeamRunId is invalid");
    expect(() => layout.getTeamAgentRunDirPath(
      { rootTeamRunId: "team-1", teamRunPath: ["../escape"] },
      "member-a",
    )).toThrow("teamRunPath[0] is invalid");
  });

  it("guards against path traversal in standalone run segments", () => {
    expect(() => layout.getStandaloneRunDirPath("../escape")).toThrow("agentRunId is invalid");
    expect(() => layout.getStandaloneRunDirPath("nested/agent")).toThrow("agentRunId is invalid");
  });
});
