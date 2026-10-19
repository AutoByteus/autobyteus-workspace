import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";
import { ContextFilePathContainmentError } from "../../../src/context-files/domain/context-file-owner-types.js";

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

  it("raises a descriptor-family containment error when a path would leave its root", () => {
    const layout = new ContextFileLayout({ appDataDir: "/tmp/context-file-layout/app-data", memoryDir: "/tmp/context-file-layout/memory" });
    // Unvalidated descriptors reach the guard only if the codec were bypassed; the guard is defence in depth.
    expect(() => layout.getDraftOwnerDirPath({ kind: "agent_draft", draftRunId: "../../../outside" }))
      .toThrow(ContextFilePathContainmentError);
    expect(() => layout.getDraftFilePath({ kind: "agent_draft", draftRunId: "../../../outside" }, "ctx_a__b.txt"))
      .toThrow("Context-file path escapes its owner folder.");
    expect(layout.getDraftFilePath({ kind: "agent_draft", draftRunId: "temp-1-1" }, "ctx_a__b.txt"))
      .toBe(path.join("/tmp/context-file-layout/app-data", "draft_context_files", "agent-runs", "temp-1-1", "context_files", "ctx_a__b.txt"));
  });
});
