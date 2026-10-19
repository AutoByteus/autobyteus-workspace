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

describe("diffSkillVersion", () => {
  it("marks each differing file changed, added or removed, SKILL.md first, then by path", () => {
    const seen = snapshotOf("/s/code-review", { "SKILL.md": "a", "references/a.md": "a", "scripts/old.sh": "o" });
    const current = snapshotOf("/s/code-review", { "SKILL.md": "b", "references/a.md": "a", "references/new.md": "n" });
    expect(diffSkillVersion("code-review", seen, current)).toEqual({
      kind: "updated", skillName: "code-review", skillDir: "/s/code-review",
      files: [
        { path: "SKILL.md", status: "changed" },
        { path: "references/new.md", status: "added" },
        { path: "scripts/old.sh", status: "removed" },
      ],
    });
  });

  it("treats a moved folder with the same files as unchanged, and with changes as updated at the new folder", () => {
    const seen = snapshotOf("/g1/code-review", { "SKILL.md": "a" });
    expect(diffSkillVersion("code-review", seen, snapshotOf("/g2/code-review", { "SKILL.md": "a" }))).toBeNull();
    expect(diffSkillVersion("code-review", seen, snapshotOf("/g2/code-review", { "SKILL.md": "b" }))).toEqual({
      kind: "updated", skillName: "code-review", skillDir: "/g2/code-review", files: [{ path: "SKILL.md", status: "changed" }],
    });
  });

  it("reports a skill that no longer resolves as removed, only when the run had seen it", () => {
    expect(diffSkillVersion("code-review", snapshotOf("/s/code-review", { "SKILL.md": "a" }), null))
      .toEqual({ kind: "removed", skillName: "code-review" });
    expect(diffSkillVersion("code-review", undefined, null)).toBeNull();
  });
});

describe("skill update notice text and message", () => {
  const updated = (skillName: string, files: Array<[string, "changed" | "added" | "removed"]>) => ({
    kind: "updated" as const, skillName, skillDir: `/skills/${skillName}`,
    files: files.map(([path, status]) => ({ path, status })),
  });

  it("AC-001: only reference files changed: one block naming the package and its folder, the exact files, no SKILL.md", () => {
    const text = buildSkillUpdateNoticeText([
      updated("agent-package-creation", [["references/a.md", "changed"], ["references/b.md", "changed"]]),
    ]);
    expect(text).toBe([
      "[Platform notice — skill updated]",
      "",
      "Your skill package `agent-package-creation` has been updated (/skills/agent-package-creation).",
      "",
      "Changed files:",
      "- references/a.md (changed)",
      "- references/b.md (changed)",
      "",
      "Re-read the updated files before continuing work that relies on this skill.",
    ].join("\n"));
    expect(text).not.toContain("SKILL.md");
  });

  it("AC-002: SKILL.md changed, a file added and one removed: each with its status, plus the removed-files line", () => {
    const text = buildSkillUpdateNoticeText([
      updated("code-review", [["SKILL.md", "changed"], ["references/new.md", "added"], ["scripts/old.sh", "removed"]]),
    ]);
    expect(text).toContain([
      "Changed files:",
      "- SKILL.md (changed)",
      "- references/new.md (added)",
      "- scripts/old.sh (removed)",
      "",
      "Re-read the updated files before continuing work that relies on this skill.",
      "Removed files are no longer available.",
    ].join("\n"));
  });

  it("AC-003: an updated and a removed skill: one block each, in order; the closing lines cover both", () => {
    const text = buildSkillUpdateNoticeText([
      updated("code-review", [["references/a.md", "changed"]]),
      { kind: "removed", skillName: "deep-research" },
    ]);
    expect(text).toBe([
      "[Platform notice — skill updated]",
      "",
      "Your skill package `code-review` has been updated (/skills/code-review).",
      "",
      "Changed files:",
      "- references/a.md (changed)",
      "",
      "Your skill package `deep-research` is no longer available.",
      "",
      "Re-read the updated files before continuing work that relies on this skill.",
      "Do not rely on a skill that is no longer available.",
    ].join("\n"));
  });

  it("says 'these skills' when several skills were updated, and has no re-read line when none was", () => {
    const several = buildSkillUpdateNoticeText([
      updated("code-review", [["SKILL.md", "changed"]]),
      updated("deep-research", [["references/a.md", "added"]]),
    ]);
    expect(several).toContain("Re-read the updated files before continuing work that relies on these skills.");
    const removedOnly = buildSkillUpdateNoticeText([{ kind: "removed", skillName: "deep-research" }]);
    expect(removedOnly).not.toContain("Re-read");
    expect(removedOnly).not.toContain("Removed files");
    expect(removedOnly.endsWith("Do not rely on a skill that is no longer available.")).toBe(true);
  });

  it("AC-004: 25 changed files list 10, then '…and 15 more files'", () => {
    const files = Array.from({ length: 25 }, (_, index) => `references/r${String(index).padStart(2, "0")}.md`);
    const text = buildSkillUpdateNoticeText([updated("code-review", files.map((file) => [file, "changed"]))]);
    const listed = text.split("\n").filter((line) => line.startsWith("- "));
    expect(listed).toEqual([...files.slice(0, 10).map((file) => `- ${file} (changed)`), "- …and 15 more files"]);
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
