import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";

describe("TeamMemberMemoryLayout", () => {
  let memoryDir: string;
  let layout: TeamMemberMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-member-layout-"));
    layout = new TeamMemberMemoryLayout(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("creates member subtrees under the canonical team directory", async () => {
    await layout.ensureLocalMemberSubtrees("team-1", ["member-a", "member-b"]);

    const memberDirA = layout.getMemberDirPath("team-1", "member-a");
    const memberDirB = layout.getMemberDirPath("team-1", "member-b");
    expect((await fs.stat(memberDirA)).isDirectory()).toBe(true);
    expect((await fs.stat(memberDirB)).isDirectory()).toBe(true);
  });

  it("guards against path traversal in team id", () => {
    expect(() => layout.getTeamDirPath("../escape")).toThrow("Invalid team directory path");
  });
});
