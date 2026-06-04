import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SelfEvolutionChangeRecorder } from "../../src/self-evolution/services/self-evolution-change-recorder.js";
import type { SelfEvolutionSkillTarget } from "../../src/self-evolution/domain/models.js";

const execFileAsync = promisify(execFile);

const runGit = async (root: string, args: string[]) => {
  await execFileAsync("git", ["-C", root, ...args], { timeout: 5_000 });
};

describe("SelfEvolutionChangeRecorder", () => {
  let tempRoot: string;
  let extraTempRoots: string[];
  let target: SelfEvolutionSkillTarget;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-change-recorder-"));
    extraTempRoots = [];
    await runGit(tempRoot, ["init"]);
    await runGit(tempRoot, ["config", "user.email", "test@example.com"]);
    await runGit(tempRoot, ["config", "user.name", "Test User"]);
    const skillRoot = path.join(tempRoot, "skills", "target");
    await fs.mkdir(skillRoot, { recursive: true });
    const skillMdPath = path.join(skillRoot, "SKILL.md");
    await fs.writeFile(skillMdPath, "# Target skill\n", "utf8");
    await fs.writeFile(path.join(tempRoot, "agent.md"), "# Agent\n", "utf8");
    await runGit(tempRoot, ["add", "."]);
    await runGit(tempRoot, ["commit", "-m", "initial"]);
    target = {
      skillName: "target",
      skillRootPath: skillRoot,
      skillMdPath,
      isWritable: true,
      gitRootPath: tempRoot,
      rollbackMode: "git",
    };
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
    await Promise.all(extraTempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it("detects off-target Git mutations instead of hiding them behind target pathspecs", async () => {
    const recorder = new SelfEvolutionChangeRecorder();
    const before = await recorder.captureBefore([target]);
    await fs.writeFile(path.join(tempRoot, "agent.md"), "# Agent\nOff-target change\n", "utf8");

    const summary = await recorder.summarizeChanges({
      before,
      auditedSkillTargets: [target],
      editableSkillTargets: [target],
    });

    expect(summary.changedSkillPaths).toEqual([]);
    expect(summary.offTargetChangePaths).toContain(path.join(tempRoot, "agent.md"));
    expect(summary.policyViolations[0]).toContain("off-target path");
  });

  it("does not count same-content target rewrites as persistent skill changes", async () => {
    const recorder = new SelfEvolutionChangeRecorder();
    const before = await recorder.captureBefore([target]);
    await fs.writeFile(target.skillMdPath, "# Target skill\n", "utf8");

    const summary = await recorder.summarizeChanges({
      before,
      auditedSkillTargets: [target],
      editableSkillTargets: [target],
    });

    expect(summary.changedSkillPaths).toEqual([]);
    expect(summary.offTargetChangePaths).toEqual([]);
    expect(summary.detectionMode).toBe("none");
  });

  it("records editable target mutations as valid changed skill paths", async () => {
    const recorder = new SelfEvolutionChangeRecorder();
    const before = await recorder.captureBefore([target]);
    await fs.writeFile(target.skillMdPath, "# Target skill\nValid update\n", "utf8");

    const summary = await recorder.summarizeChanges({
      before,
      auditedSkillTargets: [target],
      editableSkillTargets: [target],
    });

    expect(summary.changedSkillPaths).toEqual([target.skillMdPath]);
    expect(summary.offTargetChangePaths).toEqual([]);
    expect(summary.policyViolations).toEqual([]);
    expect(summary.detectionMode).toBe("file_hash");
  });

  it("treats non-Git read-only configured skill mutations as policy violations", async () => {
    const readOnlyRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-readonly-skill-"));
    extraTempRoots.push(readOnlyRoot);
    const readOnlySkillMdPath = path.join(readOnlyRoot, "SKILL.md");
    await fs.writeFile(readOnlySkillMdPath, "# Read-only skill\n", "utf8");
    const readOnlyTarget: SelfEvolutionSkillTarget = {
      skillName: "readonly",
      skillRootPath: readOnlyRoot,
      skillMdPath: readOnlySkillMdPath,
      isWritable: false,
      gitRootPath: null,
      rollbackMode: "unversioned",
    };
    const recorder = new SelfEvolutionChangeRecorder();
    const before = await recorder.captureBefore([target, readOnlyTarget]);

    await fs.writeFile(readOnlySkillMdPath, "# Read-only skill\nInvalid update\n", "utf8");

    const summary = await recorder.summarizeChanges({
      before,
      auditedSkillTargets: [target, readOnlyTarget],
      editableSkillTargets: [target],
    });

    expect(summary.changedSkillPaths).toEqual([]);
    expect(summary.offTargetChangePaths).toContain(readOnlySkillMdPath);
    expect(summary.policyViolations).toEqual([
      `Self-evolver changed non-editable configured skill path '${readOnlySkillMdPath}'.`,
    ]);
    expect(summary.detectionMode).toBe("file_hash");
  });

  it("treats Git-backed read-only configured skill mutations as policy violations only", async () => {
    const readOnlySkillRoot = path.join(tempRoot, "skills", "readonly");
    await fs.mkdir(readOnlySkillRoot, { recursive: true });
    const readOnlySkillMdPath = path.join(readOnlySkillRoot, "SKILL.md");
    await fs.writeFile(readOnlySkillMdPath, "# Read-only Git-backed skill\n", "utf8");
    await runGit(tempRoot, ["add", "."]);
    await runGit(tempRoot, ["commit", "-m", "add readonly skill"]);
    const readOnlyTarget: SelfEvolutionSkillTarget = {
      skillName: "readonly",
      skillRootPath: readOnlySkillRoot,
      skillMdPath: readOnlySkillMdPath,
      isWritable: false,
      gitRootPath: tempRoot,
      rollbackMode: "git",
    };
    const recorder = new SelfEvolutionChangeRecorder();
    const before = await recorder.captureBefore([target, readOnlyTarget]);

    await fs.writeFile(readOnlySkillMdPath, "# Read-only Git-backed skill\nInvalid update\n", "utf8");

    const summary = await recorder.summarizeChanges({
      before,
      auditedSkillTargets: [target, readOnlyTarget],
      editableSkillTargets: [target],
    });

    expect(summary.changedSkillPaths).toEqual([]);
    expect(summary.offTargetChangePaths).toContain(readOnlySkillMdPath);
    expect(summary.policyViolations).toEqual([
      `Self-evolver changed non-editable configured skill path '${readOnlySkillMdPath}'.`,
    ]);
    expect(summary.detectionMode).toBe("git");
  });
});
