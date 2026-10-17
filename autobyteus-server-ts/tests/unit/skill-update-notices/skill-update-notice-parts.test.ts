import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SkillFolderSnapshotter } from "../../../src/skill-update-notices/providers/skill-folder-snapshotter.js";
import { SeenSkillVersionsStore, SEEN_SKILL_VERSIONS_FILE_NAME } from "../../../src/skill-update-notices/providers/seen-skill-versions-store.js";
import { diffSkillVersion } from "../../../src/skill-update-notices/services/skill-version-diff.js";
import {
  buildSkillUpdateNoticeMessage,
  buildSkillUpdateNoticeText,
} from "../../../src/skill-update-notices/services/skill-update-notice-builder.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import type { SkillFolderSnapshot } from "../../../src/skill-update-notices/domain/skill-update-notice-types.js";

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const tempDir = async (): Promise<string> => {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-notice-parts-")));
  tempDirs.push(dir);
  return dir;
};

const write = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
};

const snapshotOf = (skillDir: string, files: Record<string, string>): SkillFolderSnapshot =>
  ({ skillName: "code-review", skillDir, skillMdPath: path.join(skillDir, "SKILL.md"), files });

describe("SkillFolderSnapshotter (REQ-010)", () => {
  it("hashes the skill's files by relative path, skipping noise, the folder's .gitignore and temp files", async () => {
    const skillDir = path.join(await tempDir(), "code-review");
    await write(path.join(skillDir, "SKILL.md"), "v1");
    await write(path.join(skillDir, "references", "checklist.md"), "c");
    await write(path.join(skillDir, "lib", "helper.py"), "h"); // a legitimate folder
    await write(path.join(skillDir, "env", "settings.json"), "{}"); // also legitimate
    await write(path.join(skillDir, ".gitignore"), "generated/\n*.log\n");
    for (const noisy of [
      ".git/HEAD", "node_modules/x/index.js", ".venv/lib/a.py", "venv/b.py", "__pycache__/c.pyc",
      ".pytest_cache/d", ".mypy_cache/e", "dist/f.js", "build/g.js", ".DS_Store", "notes.md.swp",
      "draft.md~", ".#lock", "generated/out.txt", "run.log",
    ]) await write(path.join(skillDir, noisy), "noise");

    const snapshot = await new SkillFolderSnapshotter().snapshot({ name: "code-review", rootPath: skillDir });

    expect(Object.keys(snapshot!.files)).toEqual([
      ".gitignore", "env/settings.json", "lib/helper.py", "references/checklist.md", "SKILL.md",
    ].sort((a, b) => a.localeCompare(b)));
    expect(snapshot!.skillMdPath).toBe(path.join(skillDir, "SKILL.md"));
  });

  it("gives identical digests for a content-identical save and returns null for a missing folder", async () => {
    const skillDir = path.join(await tempDir(), "code-review");
    await write(path.join(skillDir, "SKILL.md"), "same");
    const snapshotter = new SkillFolderSnapshotter();
    const before = await snapshotter.snapshot({ name: "code-review", rootPath: skillDir });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await write(path.join(skillDir, "SKILL.md"), "same");
    const after = await snapshotter.snapshot({ name: "code-review", rootPath: skillDir });

    expect(after!.files).toEqual(before!.files);
    expect(await snapshotter.snapshot({ name: "gone", rootPath: path.join(skillDir, "..", "missing") })).toBeNull();
  });
});

describe("diffSkillVersion (REQ-008, REQ-009, DEC-011)", () => {
  it("lists changed, added and removed files with SKILL.md first", () => {
    const seen = snapshotOf("/s/code-review", { "SKILL.md": "a", "references/a.md": "a", "references/old.md": "o" });
    const current = snapshotOf("/s/code-review", { "SKILL.md": "b", "references/a.md": "a", "references/new.md": "n" });
    expect(diffSkillVersion("code-review", seen, current)).toEqual({
      kind: "updated", skillName: "code-review", skillMdPath: "/s/code-review/SKILL.md",
      changedFiles: ["SKILL.md", "references/new.md", "references/old.md"],
    });
  });

  it("treats a moved folder with the same files as unchanged, and with changes as updated at the new path", () => {
    const seen = snapshotOf("/g1/code-review", { "SKILL.md": "a" });
    expect(diffSkillVersion("code-review", seen, snapshotOf("/g2/code-review", { "SKILL.md": "a" }))).toBeNull();
    expect(diffSkillVersion("code-review", seen, snapshotOf("/g2/code-review", { "SKILL.md": "b" }))).toMatchObject({
      kind: "updated", skillMdPath: "/g2/code-review/SKILL.md", changedFiles: ["SKILL.md"],
    });
  });

  it("reports a skill that no longer resolves as removed, only when the run had seen it", () => {
    expect(diffSkillVersion("code-review", snapshotOf("/s/code-review", { "SKILL.md": "a" }), null))
      .toEqual({ kind: "removed", skillName: "code-review" });
    expect(diffSkillVersion("code-review", undefined, null)).toBeNull();
  });
});

describe("skill update notice text and message (REQ-007, REQ-008)", () => {
  it("names each skill, its changed files (10 then 'and N more') and its SKILL.md path, and removed skills", () => {
    const files = Array.from({ length: 12 }, (_, index) => `references/r${String(index).padStart(2, "0")}.md`);
    const text = buildSkillUpdateNoticeText([
      { kind: "updated", skillName: "code-review", skillMdPath: "/s/code-review/SKILL.md", changedFiles: ["SKILL.md", ...files] },
      { kind: "removed", skillName: "deep-research" },
    ]);
    expect(text.split("\n")[0]).toBe("[Platform notice — skill updated]");
    expect(text).toContain(`- code-review (/s/code-review/SKILL.md): SKILL.md, ${files.slice(0, 9).join(", ")} and 3 more`);
    expect(text).toContain("- deep-research: no longer available");
    expect(text).toContain("Re-read the updated SKILL.md");
  });

  it("builds the busy-run message as a SYSTEM, notice-only platform message without a native auto-notification", () => {
    const message = buildSkillUpdateNoticeMessage("notice text");
    expect(message.senderType).toBe(SenderType.SYSTEM);
    expect(message.metadata).toMatchObject({
      skill_update_notice: true, sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, suppress_system_task_notification: true,
    });
    expect(readPlatformInputPreface(message.metadata)).toEqual({
      content: "notice text", senderId: SKILL_UPDATE_NOTICE_SENDER_ID, originalContent: null,
    });
  });
});

describe("SeenSkillVersionsStore", () => {
  it("writes the record atomically into the run's memory folder and reads it back", async () => {
    const memoryDir = path.join(await tempDir(), "run-1");
    await fs.mkdir(memoryDir);
    const store = new SeenSkillVersionsStore();
    const versions = new Map([["code-review", snapshotOf("/s/code-review", { "SKILL.md": "a" })]]);

    expect(await store.write({ runId: "run-1", memoryDir }, versions)).toBe("written");

    expect((await fs.readdir(memoryDir))).toEqual([SEEN_SKILL_VERSIONS_FILE_NAME]);
    expect(await store.read({ runId: "run-1", memoryDir })).toEqual(versions);
  });

  it("never creates a missing memory folder, and stops (leaving no temp file) once told to (DR-001)", async () => {
    const root = await tempDir();
    const store = new SeenSkillVersionsStore();
    const versions = new Map([["code-review", snapshotOf("/s/code-review", { "SKILL.md": "a" })]]);

    const missing = path.join(root, "deleted-run");
    expect(await store.write({ runId: "deleted-run", memoryDir: missing }, versions)).toBe("folder_missing");
    expect(await fs.readdir(root)).toEqual([]);

    const memoryDir = path.join(root, "released-run");
    await fs.mkdir(memoryDir);
    let checks = 0;
    // Allowed past the folder check, stopped before the rename (released mid-write).
    const result = await store.write({ runId: "released-run", memoryDir }, versions, () => ++checks <= 2);
    expect(result).toBe("aborted");
    expect(await fs.readdir(memoryDir)).toEqual([]);
    expect(await store.write({ runId: "released-run", memoryDir }, versions, () => false)).toBe("aborted");
    expect(await fs.readdir(memoryDir)).toEqual([]);
  });

  it("treats a missing or invalid record as none, and keeps runs without a memory folder in memory", async () => {
    const memoryDir = path.join(await tempDir(), "run-2");
    const store = new SeenSkillVersionsStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await store.read({ runId: "run-2", memoryDir })).toBeNull();
    await write(path.join(memoryDir, SEEN_SKILL_VERSIONS_FILE_NAME), "{ not json");
    expect(await store.read({ runId: "run-2", memoryDir })).toBeNull();
    warn.mockRestore();

    const versions = new Map([["code-review", snapshotOf("/s/code-review", { "SKILL.md": "a" })]]);
    await store.write({ runId: "helper", memoryDir: null }, versions);
    expect(await store.read({ runId: "helper", memoryDir: null })).toEqual(versions);
    store.forget({ runId: "helper", memoryDir: null });
    expect(await store.read({ runId: "helper", memoryDir: null })).toBeNull();
  });
});
