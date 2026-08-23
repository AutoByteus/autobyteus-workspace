import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Skill } from "../../../../../src/skills/domain/models.js";
import {
  CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE,
  getClaudeWorkspaceSkillMaterializer,
} from "../../../../../src/agent-execution/backends/claude/claude-workspace-skill-materializer.js";

const tempRoots: string[] = [];

describe("Claude workspace skill materializer composition", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it("provides the Claude profile through one shared singleton", () => {
    expect(CLAUDE_WORKSPACE_SKILL_MATERIALIZATION_PROFILE).toEqual({
      runtimeLabel: "Claude",
      workspaceSkillsRootSegments: [".claude", "skills"],
    });
    expect(getClaudeWorkspaceSkillMaterializer()).toBe(getClaudeWorkspaceSkillMaterializer());
  });

  it("places an exposure under .claude/skills", async () => {
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "claude-profile-source-"));
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "claude-profile-workspace-"));
    tempRoots.push(source, workspace);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Claude\n", "utf8");
    const skill = new Skill({ name: "claude-profile", description: "test", content: "# Claude", rootPath: source });
    const materializer = getClaudeWorkspaceSkillMaterializer();

    const descriptors = await materializer.materializeConfiguredWorkspaceSkills({
      runId: "claude-profile-run",
      workingDirectory: workspace,
      requests: [{ kind: "expose-resolved", skill }],
    });
    expect(descriptors[0]!.materializedRootPath).toBe(path.join(workspace, ".claude", "skills", "claude-profile"));
    await materializer.cleanupMaterializedWorkspaceSkills(descriptors);
  });
});
