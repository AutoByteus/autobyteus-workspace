import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamMemberMemoryLayoutStore } from "../../../src/run-history/store/team-member-memory-layout-store.js";

const createTempMemoryDir = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-team-member-layout-"));

describe("TeamMemberMemoryLayoutStore", () => {
  let memoryDir: string;
  let store: TeamMemberMemoryLayoutStore;

  beforeEach(async () => {
    memoryDir = await createTempMemoryDir();
    store = new TeamMemberMemoryLayoutStore(memoryDir);
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("creates and removes local member subtrees under team directory", async () => {
    await store.ensureLocalMemberSubtrees("team-1", ["member-a", "member-b"]);

    const memberDirA = store.getMemberDirPath("team-1", "member-a");
    const memberDirB = store.getMemberDirPath("team-1", "member-b");
    expect((await fs.stat(memberDirA)).isDirectory()).toBe(true);
    expect((await fs.stat(memberDirB)).isDirectory()).toBe(true);

    await store.removeLocalMemberSubtrees("team-1", ["member-a"]);
    await expect(fs.stat(memberDirA)).rejects.toThrow();
    await expect(fs.stat(memberDirB)).resolves.toBeTruthy();

    await store.removeLocalMemberSubtrees("team-1", ["member-b"]);
    await store.removeTeamDirIfEmpty("team-1");
    await expect(fs.stat(store.getTeamDirPath("team-1"))).rejects.toThrow();
  });

  it("guards against path traversal team ids", () => {
    expect(() => store.getTeamDirPath("../escape")).toThrow("Invalid team directory path");
  });
});
