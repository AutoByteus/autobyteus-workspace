import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamMemberMemoryLayoutStore } from "../../../src/run-history/store/team-member-memory-layout-store.js";

describe("TeamMemberMemoryLayoutStore", () => {
  let memoryDir: string;
  let store: TeamMemberMemoryLayoutStore;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-member-layout-"));
    store = new TeamMemberMemoryLayoutStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("creates member subtrees under canonical team directory", async () => {
    await store.ensureLocalMemberSubtrees("team-1", ["member-a", "member-b"]);

    const memberDirA = store.getMemberDirPath("team-1", "member-a");
    const memberDirB = store.getMemberDirPath("team-1", "member-b");
    expect((await fs.stat(memberDirA)).isDirectory()).toBe(true);
    expect((await fs.stat(memberDirB)).isDirectory()).toBe(true);
  });

  it("guards against path traversal in team id", () => {
    expect(() => store.getTeamDirPath("../escape")).toThrow("Invalid team directory path");
  });
});
