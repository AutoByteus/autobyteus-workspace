import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Skill } from "../../../../../src/skills/domain/models.js";
import {
  CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE,
  getCodexWorkspaceSkillMaterializer,
} from "../../../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";

const tempRoots: string[] = [];

describe("Codex workspace skill materializer composition", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it("provides the Codex profile through one shared singleton", () => {
    expect(CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE).toEqual({
      runtimeLabel: "Codex",
      workspaceSkillsRootSegments: [".codex", "skills"],
    });
    expect(getCodexWorkspaceSkillMaterializer()).toBe(getCodexWorkspaceSkillMaterializer());
  });

  it("places an exposure under .codex/skills", async () => {
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "codex-profile-source-"));
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "codex-profile-workspace-"));
    tempRoots.push(source, workspace);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Codex\n", "utf8");
    const skill = new Skill({ name: "codex-profile", description: "test", content: "# Codex", rootPath: source });
    const materializer = getCodexWorkspaceSkillMaterializer();

    const descriptors = await materializer.materializeConfiguredWorkspaceSkills({
      runId: "codex-profile-run",
      workingDirectory: workspace,
      requests: [{ kind: "expose-resolved", skill }],
    });
    expect(descriptors[0]!.materializedRootPath).toBe(path.join(workspace, ".codex", "skills", "codex-profile"));
    await materializer.cleanupMaterializedWorkspaceSkills(descriptors);
  });
});
