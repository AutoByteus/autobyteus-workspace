import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import {
  DefaultCodexThreadBootstrapStrategy,
  type CodexThreadBootstrapStrategy,
} from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.js";
import { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { Skill } from "../../../src/skills/domain/models.js";
import { CodexWorkspaceSkillMaterializer } from "../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";
import type { CodexWorkspaceResolver } from "../../../src/agent-execution/backends/codex/codex-workspace-resolver.js";
import type { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../src/skills/services/skill-service.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexBootstrapperIntegration =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

type ListedSkill = {
  name: string;
  path: string | null;
  scope: string | null;
  enabled: boolean;
};

const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const createTempDir = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const createRunContext = () =>
  new AgentRunContext({
    runId: `run-${randomUUID()}`,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def",
      llmModelIdentifier: "gpt-5.4-mini",
      autoExecuteTools: false,
      workspaceId: "workspace-id",
      llmConfig: null,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    }),
    runtimeContext: null,
  });

const createConfiguredSkillFixture = async (
  skillName: string,
): Promise<{ skill: Skill; cleanupRoot: string }> => {
  const skillRoot = await createTempDir("codex-bootstrapper-configured-skill");
  await fs.mkdir(path.join(skillRoot, "agents"), { recursive: true });
  await fs.writeFile(
    path.join(skillRoot, "SKILL.md"),
    [
      "---",
      `name: ${skillName}`,
      'description: "Configured skill fixture for live Codex bootstrapper integration tests."',
      "---",
      "",
      `# ${skillName}`,
      "",
      "This is a configured skill fixture.",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillRoot, "agents", "openai.yaml"),
    [
      "interface:",
      `  display_name: ${JSON.stringify(skillName)}`,
      '  short_description: "Configured skill fixture"',
      `  default_prompt: ${JSON.stringify(`Use $${skillName}.`)}`,
      "",
    ].join("\n"),
    "utf8",
  );
  return {
    skill: new Skill({
      name: skillName,
      description: "Configured skill fixture for live Codex bootstrapper integration tests.",
      content: `# ${skillName}`,
      rootPath: skillRoot,
    }),
    cleanupRoot: skillRoot,
  };
};

const createTeamSharedSymlinkConfiguredSkillFixture = async (
  skillName: string,
): Promise<{ skill: Skill; cleanupRoot: string }> => {
  const fixtureRoot = await createTempDir("codex-bootstrapper-team-shared-skill");
  const teamRoot = path.join(fixtureRoot, "software-engineering-team");
  const skillRoot = path.join(teamRoot, "agents", skillName);
  const sharedRoot = path.join(teamRoot, "shared");
  await fs.mkdir(path.join(skillRoot, "agents"), { recursive: true });
  await fs.mkdir(sharedRoot, { recursive: true });
  await fs.writeFile(
    path.join(skillRoot, "SKILL.md"),
    [
      "---",
      `name: ${skillName}`,
      'description: "Configured skill fixture for live Codex bootstrapper integration tests."',
      "---",
      "",
      `# ${skillName}`,
      "",
      "This is a configured skill fixture.",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillRoot, "agents", "openai.yaml"),
    [
      "interface:",
      `  display_name: ${JSON.stringify(skillName)}`,
      '  short_description: "Configured skill fixture"',
      `  default_prompt: ${JSON.stringify(`Use $${skillName}.`)}`,
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(path.join(sharedRoot, "design-principles.md"), "design rules\n", "utf8");
  await fs.writeFile(path.join(sharedRoot, "common-design-practices.md"), "common rules\n", "utf8");
  await fs.symlink(
    path.join("..", "..", "shared", "design-principles.md"),
    path.join(skillRoot, "design-principles.md"),
  );
  await fs.symlink(
    path.join("..", "..", "shared", "common-design-practices.md"),
    path.join(skillRoot, "common-design-practices.md"),
  );
  return {
    skill: new Skill({
      name: skillName,
      description: "Configured skill fixture for live Codex bootstrapper integration tests.",
      content: `# ${skillName}`,
      rootPath: skillRoot,
    }),
    cleanupRoot: fixtureRoot,
  };
};

const createRepoCodexSkillBundle = async (input: {
  workspaceRoot: string;
  folderName: string;
  skillName: string;
}): Promise<string> => {
  const skillRoot = path.join(
    input.workspaceRoot,
    ".codex",
    "skills",
    input.folderName,
  );
  await fs.mkdir(path.join(skillRoot, "agents"), { recursive: true });
  await fs.writeFile(
    path.join(skillRoot, "SKILL.md"),
    [
      "---",
      `name: ${input.skillName}`,
      'description: "Repo-local Codex skill fixture for live integration tests."',
      "---",
      "",
      `# ${input.skillName}`,
      "",
      "This repo-local skill should be discoverable by Codex.",
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillRoot, "agents", "openai.yaml"),
    [
      "interface:",
      `  display_name: ${JSON.stringify(input.skillName)}`,
      '  short_description: "Repo-local Codex skill fixture"',
      `  default_prompt: ${JSON.stringify(`Use $${input.skillName}.`)}`,
      "",
    ].join("\n"),
    "utf8",
  );
  return skillRoot;
};

const listSkills = async (
  manager: CodexAppServerClientManager,
  workspaceRoot: string,
): Promise<ListedSkill[]> => {
  const client = await manager.getClient(workspaceRoot);
  const response = await client.request<unknown>("skills/list", {
    cwds: [workspaceRoot],
    forceReload: true,
  });
  const root = asObjectRecord(response);
  const data = Array.isArray(root?.data) ? root.data : [];
  const results: ListedSkill[] = [];
  for (const entryValue of data) {
    const entry = asObjectRecord(entryValue);
    const skills = Array.isArray(entry?.skills) ? entry.skills : [];
    for (const skillValue of skills) {
      const skill = asObjectRecord(skillValue);
      results.push({
        name: typeof skill?.name === "string" ? skill.name : "",
        path: typeof skill?.path === "string" ? skill.path : null,
        scope: typeof skill?.scope === "string" ? skill.scope : null,
        enabled: skill?.enabled === true,
      });
    }
  }
  return results;
};

const createBootstrapper = (input: {
  workspaceRoot: string;
  configuredSkills: Skill[];
  clientManager: CodexAppServerClientManager;
  materializer: CodexWorkspaceSkillMaterializer;
}) => {
  const workspaceResolver = {
    resolveWorkingDirectory: async () => input.workspaceRoot,
  } as unknown as CodexWorkspaceResolver;
  const agentDefinitionService = {
    getAgentDefinitionById: async () => ({
      skillNames: input.configuredSkills.map((skill) => skill.name),
      toolNames: [],
      instructions: null,
      description: null,
    }),
  } as unknown as AgentDefinitionService;
  const skillService = {
    getSkills: async () => input.configuredSkills,
  } as unknown as SkillService;
  const teamStrategy = {
    appliesTo: () => false,
    prepare: async () => {
      throw new Error("team strategy should not be used in this test");
    },
  } as CodexThreadBootstrapStrategy;

  return new CodexThreadBootstrapper(
    input.materializer,
    workspaceResolver,
    agentDefinitionService,
    skillService,
    new DefaultCodexThreadBootstrapStrategy(),
    teamStrategy,
    input.clientManager,
  );
};

describeCodexBootstrapperIntegration(
  "CodexThreadBootstrapper integration (live skill discovery)",
  () => {
    const cleanupRoots = new Set<string>();
    let clientManager: CodexAppServerClientManager | null = null;

    afterEach(async () => {
      if (clientManager) {
        await clientManager.close();
        clientManager = null;
      }
      await Promise.all(
        Array.from(cleanupRoots).map(async (root) => {
          await fs.rm(root, { recursive: true, force: true });
        }),
      );
      cleanupRoots.clear();
    });

    it(
      "discovers a real repo-local Codex skill by logical name and skips runtime materialization for the same configured skill",
      async () => {
        const workspaceRoot = await createTempDir("codex-bootstrapper-live-workspace");
        cleanupRoots.add(workspaceRoot);
        const skillName = `live_repo_skill_${randomUUID().replace(/-/g, "_").slice(0, 12)}`;
        const folderName = `fixture-${randomUUID().replace(/-/g, "").slice(0, 10)}`;
        await createRepoCodexSkillBundle({
          workspaceRoot,
          folderName,
          skillName,
        });
        const configuredSkillFixture = await createConfiguredSkillFixture(skillName);
        const configuredSkill = configuredSkillFixture.skill;
        cleanupRoots.add(configuredSkillFixture.cleanupRoot);
        clientManager = new CodexAppServerClientManager({
          createClient: (cwd) =>
            new CodexAppServerClient({
              command: "codex",
              args: ["app-server"],
              cwd,
              requestTimeoutMs: 30_000,
            }),
        });

        const listedSkills = await listSkills(clientManager, workspaceRoot);
        const discoveredSkill = listedSkills.find((skill) => skill.name === skillName);

        expect(discoveredSkill).toMatchObject({
          name: skillName,
          scope: "repo",
          enabled: true,
        });
        expect(discoveredSkill?.path).toBe(
          await fs.realpath(
            path.join(workspaceRoot, ".codex", "skills", folderName, "SKILL.md"),
          ),
        );

        const materializer = new CodexWorkspaceSkillMaterializer();
        const bootstrapper = createBootstrapper({
          workspaceRoot,
          configuredSkills: [configuredSkill],
          clientManager,
          materializer,
        });

        const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

        expect(runContext.runtimeContext.materializedConfiguredSkills).toEqual([]);
        const workspaceSkillEntries = await fs.readdir(
          path.join(workspaceRoot, ".codex", "skills"),
        );
        expect(workspaceSkillEntries.some((entry) => entry.startsWith("autobyteus-"))).toBe(
          false,
        );
      },
      60_000,
    );

    it(
      "materializes a configured skill when live discovery does not already expose the skill name",
      async () => {
        const workspaceRoot = await createTempDir("codex-bootstrapper-live-materialize");
        cleanupRoots.add(workspaceRoot);
        const skillName = `live_missing_skill_${randomUUID().replace(/-/g, "_").slice(0, 12)}`;
        const configuredSkillFixture =
          await createTeamSharedSymlinkConfiguredSkillFixture(skillName);
        const configuredSkill = configuredSkillFixture.skill;
        cleanupRoots.add(configuredSkillFixture.cleanupRoot);
        clientManager = new CodexAppServerClientManager({
          createClient: (cwd) =>
            new CodexAppServerClient({
              command: "codex",
              args: ["app-server"],
              cwd,
              requestTimeoutMs: 30_000,
            }),
        });
        const materializer = new CodexWorkspaceSkillMaterializer();
        const bootstrapper = createBootstrapper({
          workspaceRoot,
          configuredSkills: [configuredSkill],
          clientManager,
          materializer,
        });

        const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

        expect(runContext.runtimeContext.materializedConfiguredSkills).toHaveLength(1);
        const [descriptor] = runContext.runtimeContext.materializedConfiguredSkills;
        expect(descriptor?.name).toBe(skillName);
        expect(path.basename(descriptor?.materializedRootPath ?? "")).toMatch(/^autobyteus-/);
        await expect(
          fs.stat(path.join(descriptor.materializedRootPath, "SKILL.md")),
        ).resolves.toBeTruthy();
        await fs.rm(configuredSkillFixture.cleanupRoot, { recursive: true, force: true });
        cleanupRoots.delete(configuredSkillFixture.cleanupRoot);

        const designPrinciplesPath = path.join(
          descriptor.materializedRootPath,
          "design-principles.md",
        );
        const commonPracticesPath = path.join(
          descriptor.materializedRootPath,
          "common-design-practices.md",
        );
        expect((await fs.lstat(designPrinciplesPath)).isSymbolicLink()).toBe(false);
        expect((await fs.lstat(commonPracticesPath)).isSymbolicLink()).toBe(false);
        expect(await fs.readFile(designPrinciplesPath, "utf8")).toBe("design rules\n");
        expect(await fs.readFile(commonPracticesPath, "utf8")).toBe("common rules\n");
        await expect(fs.stat(path.join(workspaceRoot, ".codex", "shared"))).rejects.toThrow();

        const listedSkills = await listSkills(clientManager, workspaceRoot);
        const discoveredSkill = listedSkills.find((skill) => skill.name === skillName);

        expect(discoveredSkill).toMatchObject({
          name: skillName,
          scope: "repo",
          enabled: true,
        });
        expect(discoveredSkill?.path).toBe(
          await fs.realpath(path.join(descriptor.materializedRootPath, "SKILL.md")),
        );

        await clientManager.close();
        clientManager = null;
        await materializer.cleanupMaterializedCodexWorkspaceSkills(
          runContext.runtimeContext.materializedConfiguredSkills,
        );
        await expect(fs.stat(descriptor.materializedRootPath)).rejects.toThrow();
      },
      60_000,
    );
  },
);
