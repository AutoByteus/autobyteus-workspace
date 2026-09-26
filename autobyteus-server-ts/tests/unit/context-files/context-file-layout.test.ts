import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";

describe("ContextFileLayout", () => {
  it("uses resolved team-member memoryDir for final context-file paths", () => {
    const memoryDir = "/tmp/context-file-layout/agent_teams/root-team-run/child-team-run/reviewer-run";
    const layout = new ContextFileLayout({
      appDataDir: "/tmp/context-file-layout/app-data",
      memoryDir: "/tmp/context-file-layout/memory",
    });

    expect(layout.getFinalOwnerDirPath({
      kind: "team_member_final",
      teamRunId: "root-team-run",
      rootTeamRunId: "root-team-run",
      ancestorTeamRunIds: ["child-team-run"],
      agentRunId: "reviewer-run",
      memoryDir,
    })).toBe(path.join(memoryDir, "context_files"));
  });
});
