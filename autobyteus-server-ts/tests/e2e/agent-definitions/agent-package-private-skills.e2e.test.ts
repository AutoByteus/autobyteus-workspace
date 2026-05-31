import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import type { AgentConfig } from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-definition-id.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AutoByteusAgentRunBackendFactory } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { CodexWorkspaceSkillMaterializer, type MaterializedCodexWorkspaceSkill } from "../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";
import type { CodexWorkspaceResolver } from "../../../src/agent-execution/backends/codex/codex-workspace-resolver.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { DefaultCodexThreadBootstrapStrategy, type CodexThreadBootstrapStrategy } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";

const createAgentMd = (name: string, description: string, instructions: string): string =>
  ["---", `name: ${name}`, `description: ${description}`, "---", "", instructions].join("\n");

const createTeamMd = (name: string, description: string, instructions: string): string =>
  ["---", `name: ${name}`, `description: ${description}`, "---", "", instructions].join("\n");

const parseAdditionalRoots = (): string[] => {
  const raw = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS ?? "";
  if (!raw.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const roots: string[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const resolved = path.resolve(trimmed);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    roots.push(resolved);
  }

  return roots;
};

const createTestRootSettingsStore = (defaultRoot: string): AgentPackageRootSettingsStore =>
  new AgentPackageRootSettingsStore(
    {
      getAppDataDir: () => defaultRoot,
      getAdditionalAgentPackageRoots: () => parseAdditionalRoots(),
      get: (key: string, defaultValue?: string) => process.env[key] ?? defaultValue,
    },
    {
      updateSetting: (key: string, value: string) => {
        if (value) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
        return [true, "updated"];
      },
    },
  );

const createTestRegistryStore = (registryRoot: string): AgentPackageRegistryStore =>
  new AgentPackageRegistryStore({
    getAppDataDir: () => registryRoot,
  });

const writeAgentDefinition = async (
  rootPath: string,
  agentId: string,
  payload: {
    name: string;
    description: string;
    instructions: string;
    skillNames?: string[];
  },
): Promise<string> => {
  const dirPath = path.join(rootPath, "agents", agentId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(
    path.join(dirPath, "agent.md"),
    createAgentMd(payload.name, payload.description, payload.instructions),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dirPath, "agent-config.json"),
    JSON.stringify({ skillNames: payload.skillNames ?? [] }, null, 2),
    "utf-8",
  );
  return dirPath;
};

const writeTeamLocalAgentDefinition = async (
  rootPath: string,
  teamId: string,
  agentId: string,
  payload: {
    name: string;
    description: string;
    instructions: string;
    skillNames?: string[];
  },
): Promise<string> => {
  const dirPath = path.join(rootPath, "agent-teams", teamId, "agents", agentId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(
    path.join(dirPath, "agent.md"),
    createAgentMd(payload.name, payload.description, payload.instructions),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dirPath, "agent-config.json"),
    JSON.stringify({ skillNames: payload.skillNames ?? [] }, null, 2),
    "utf-8",
  );
  return dirPath;
};

const writeTeamDefinition = async (
  rootPath: string,
  teamId: string,
  payload: {
    name: string;
    description: string;
    instructions: string;
    members: string[];
  },
): Promise<string> => {
  const dirPath = path.join(rootPath, "agent-teams", teamId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(
    path.join(dirPath, "team.md"),
    createTeamMd(payload.name, payload.description, payload.instructions),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dirPath, "team-config.json"),
    JSON.stringify(
      {
        coordinatorMemberName: payload.members[0] ?? "coordinator",
        members: payload.members.map((memberName) => ({
          memberName,
          ref: memberName,
          refType: "agent",
          refScope: "team_local",
        })),
      },
      null,
      2,
    ),
    "utf-8",
  );
  return dirPath;
};

const writeSkillDirectory = async (
  skillDir: string,
  name: string,
  description: string,
  content: string,
): Promise<string> => {
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    ["---", `name: ${name}`, `description: ${description}`, "---", "", content, ""].join("\n"),
    "utf-8",
  );
  return skillDir;
};

const importLocalPackage = async (
  execGraphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  source: string,
): Promise<{
  packageId: string;
  path: string;
  sharedAgentCount: number;
  teamLocalAgentCount: number;
  agentTeamCount: number;
}> => {
  const importResult = await execGraphql<{
    importAgentPackage: Array<{
      packageId: string;
      path: string;
      sharedAgentCount: number;
      teamLocalAgentCount: number;
      agentTeamCount: number;
    }>;
  }>(
    `
      mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
        importAgentPackage(input: $input) {
          packageId
          path
          sharedAgentCount
          teamLocalAgentCount
          agentTeamCount
        }
      }
    `,
    {
      input: {
        sourceKind: "LOCAL_PATH",
        source,
      },
    },
  );

  const imported = importResult.importAgentPackage.find((entry) => entry.path === source);
  expect(imported).toBeDefined();
  return imported!;
};

const createRuntimeRunConfig = (input: {
  agentDefinitionId: string;
  runtimeKind: RuntimeKind;
  workspaceId: string;
  memoryDir?: string | null;
}): AgentRunConfig =>
  new AgentRunConfig({
    agentDefinitionId: input.agentDefinitionId,
    runtimeKind: input.runtimeKind,
    llmModelIdentifier: "runtime-e2e-model",
    autoExecuteTools: false,
    workspaceId: input.workspaceId,
    memoryDir: input.memoryDir ?? null,
    skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  });

const createCodexRunContext = (input: {
  runId: string;
  agentDefinitionId: string;
  workspaceId: string;
}): AgentRunContext<null> =>
  new AgentRunContext({
    runId: input.runId,
    config: createRuntimeRunConfig({
      agentDefinitionId: input.agentDefinitionId,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      workspaceId: input.workspaceId,
    }),
    runtimeContext: null,
  });

const createCodexBootstrapper = (workingDirectory: string): CodexThreadBootstrapper => {
  const workspaceResolver = {
    resolveWorkingDirectory: vi.fn(async () => workingDirectory),
  } as unknown as CodexWorkspaceResolver;
  const clientManager = {
    acquireClient: vi.fn(async () => ({
      request: vi.fn(async () => ({ data: [] })),
    })),
    releaseClient: vi.fn(async () => undefined),
  } as unknown as CodexAppServerClientManager;
  const teamBootstrapStrategy: CodexThreadBootstrapStrategy = {
    appliesTo: () => false,
    prepare: () => {
      throw new Error("team strategy should not be used for shared-agent runtime e2e");
    },
  };

  return new CodexThreadBootstrapper(
    new CodexWorkspaceSkillMaterializer(),
    workspaceResolver,
    AgentDefinitionService.getInstance(),
    SkillService.getInstance(),
    new DefaultCodexThreadBootstrapStrategy(),
    teamBootstrapStrategy,
    clientManager,
  );
};

const expectMaterializedSkillSymlink = async (input: {
  materialized: MaterializedCodexWorkspaceSkill | undefined;
  expectedName: string;
  expectedSourceRootPath: string;
  expectedContent: string;
}): Promise<void> => {
  expect(input.materialized).toBeDefined();
  const materialized = input.materialized!;
  expect(materialized.name).toBe(input.expectedName);
  expect(materialized.sourceRootPath).toBe(path.resolve(input.expectedSourceRootPath));

  const stats = await fs.lstat(materialized.materializedRootPath);
  expect(stats.isSymbolicLink()).toBe(true);
  await expect(fs.realpath(materialized.materializedRootPath)).resolves.toBe(
    await fs.realpath(input.expectedSourceRootPath),
  );
  await expect(
    fs.readFile(path.join(materialized.materializedRootPath, "SKILL.md"), "utf-8"),
  ).resolves.toContain(input.expectedContent);
};

const createAutoByteusRuntimeProbe = (workspaceRoot: string): {
  factory: AutoByteusAgentRunBackendFactory;
  capturedConfigs: Map<string, AgentConfig>;
} => {
  const capturedConfigs = new Map<string, AgentConfig>();
  const activeAgents = new Map<string, { agentId: string; currentStatus: string; start: () => void; context: null }>();
  const workspace = {
    workspaceId: "runtime_ws_private_skills",
    getName: () => "Runtime Private Skills Workspace",
    getBasePath: () => workspaceRoot,
  };

  const factory = new AutoByteusAgentRunBackendFactory({
    agentDefinitionService: AgentDefinitionService.getInstance(),
    skillService: SkillService.getInstance(),
    llmFactory: {
      createLLM: vi.fn(async () => ({})),
    } as any,
    workspaceManager: {
      getWorkspaceById: vi.fn((workspaceId: string) =>
        workspaceId === workspace.workspaceId ? workspace : undefined,
      ),
      getOrCreateTempWorkspace: vi.fn(async () => workspace),
    } as any,
    agentFactory: {
      createAgentWithId: vi.fn((agentId: string, config: AgentConfig) => {
        capturedConfigs.set(agentId, config);
        const agent = {
          agentId,
          currentStatus: "idle",
          start: vi.fn(),
          context: null,
        };
        activeAgents.set(agentId, agent);
        return agent;
      }),
      getAgent: vi.fn((agentId: string) => activeAgents.get(agentId)),
      removeAgent: vi.fn(async (agentId: string) => activeAgents.delete(agentId)),
      listActiveAgentIds: vi.fn(() => Array.from(activeAgents.keys())),
    } as any,
    waitForIdle: vi.fn(async () => undefined),
    compactionAgentRunnerFactory: vi.fn(async () => null),
  });

  return { factory, capturedConfigs };
};

describe("Agent package private skills GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let dataRoot: string;
  let originalAgentPackageRoots: string | undefined;
  let originalSkillsPaths: string | undefined;
  const cleanupPaths = new Set<string>();

  beforeAll(async () => {
    originalAgentPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    originalSkillsPaths = process.env.AUTOBYTEUS_SKILLS_PATHS;
    delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    delete process.env.AUTOBYTEUS_SKILLS_PATHS;

    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-private-skills-data-"));
    appConfigProvider.config.setCustomAppDataDir(dataRoot);
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    if (originalAgentPackageRoots === undefined) {
      delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    } else {
      process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = originalAgentPackageRoots;
    }

    if (originalSkillsPaths === undefined) {
      delete process.env.AUTOBYTEUS_SKILLS_PATHS;
    } else {
      process.env.AUTOBYTEUS_SKILLS_PATHS = originalSkillsPaths;
    }

    await fs.rm(dataRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();

    delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    delete process.env.AUTOBYTEUS_SKILLS_PATHS;
    AgentPackageService.resetInstance();
    SkillService.resetInstance();
    await AgentDefinitionService.getInstance().refreshCache();
    await AgentTeamDefinitionService.getInstance().refreshCache();
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const bootstrapPackageService = async (unique: string): Promise<{
    registryRoot: string;
    externalRoot: string;
  }> => {
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-package-private-registry-${unique}-`));
    const externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-package-private-local-${unique}-`));
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(externalRoot);

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(dataRoot),
      registryStore: createTestRegistryStore(registryRoot),
    });

    return { registryRoot, externalRoot };
  };

  const resolveAgentSkillDescriptions = async (agentId: string): Promise<string[]> => {
    const definition = await AgentDefinitionService.getInstance().getAgentDefinitionById(agentId);
    expect(definition).toBeTruthy();
    const skills = SkillService.getInstance().resolveConfiguredSkillsForAgent(definition);
    return skills.map((skill) => skill.description);
  };


  it("materializes imported shared-agent private root and multi-skill layouts for Codex runtime", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), `codex-private-skills-workspace-${unique}-`));
    cleanupPaths.add(workspaceRoot);

    const rootAgentId = `codex-root-agent-${unique}`;
    const multiAgentId = `codex-multi-agent-${unique}`;
    const rootSkillName = `codex_root_${unique}`;
    const toneSkillName = `codex_tone_${unique}`;
    const outlineSkillName = `codex_outline_${unique}`;

    const rootAgentDir = await writeAgentDefinition(externalRoot, rootAgentId, {
      name: "Codex Runtime Root Private Skill Agent",
      description: "Uses one colocated private skill at the agent root",
      instructions: "Use the root private skill.",
      skillNames: [rootSkillName],
    });
    await writeSkillDirectory(
      rootAgentDir,
      rootSkillName,
      "Codex runtime root private skill",
      "Codex root private skill content",
    );

    const multiAgentDir = await writeAgentDefinition(externalRoot, multiAgentId, {
      name: "Codex Runtime Multi Private Skill Agent",
      description: "Uses multiple private skills from the skills folder",
      instructions: "Use the private skills folder.",
      skillNames: [toneSkillName, outlineSkillName],
    });
    const toneSkillDir = await writeSkillDirectory(
      path.join(multiAgentDir, "skills", toneSkillName),
      toneSkillName,
      "Codex runtime tone private skill",
      "Codex tone private skill content",
    );
    const outlineSkillDir = await writeSkillDirectory(
      path.join(multiAgentDir, "skills", outlineSkillName),
      outlineSkillName,
      "Codex runtime outline private skill",
      "Codex outline private skill content",
    );

    const imported = await importLocalPackage(execGraphql, externalRoot);
    expect(imported.sharedAgentCount).toBe(2);
    await AgentDefinitionService.getInstance().refreshCache();
    SkillService.resetInstance();

    const bootstrapper = createCodexBootstrapper(workspaceRoot);
    const rootRunContext = await bootstrapper.bootstrapForCreate(
      createCodexRunContext({
        runId: `codex-root-run-${unique}`,
        agentDefinitionId: rootAgentId,
        workspaceId: "runtime_ws_private_skills",
      }),
    );
    expect(rootRunContext.runtimeContext.materializedConfiguredSkills).toHaveLength(1);
    const rootMaterializedByName = new Map(
      rootRunContext.runtimeContext.materializedConfiguredSkills.map((skill) => [skill.name, skill]),
    );
    await expectMaterializedSkillSymlink({
      materialized: rootMaterializedByName.get(rootSkillName),
      expectedName: rootSkillName,
      expectedSourceRootPath: rootAgentDir,
      expectedContent: "Codex root private skill content",
    });

    const multiRunContext = await bootstrapper.bootstrapForCreate(
      createCodexRunContext({
        runId: `codex-multi-run-${unique}`,
        agentDefinitionId: multiAgentId,
        workspaceId: "runtime_ws_private_skills",
      }),
    );
    expect(multiRunContext.runtimeContext.materializedConfiguredSkills).toHaveLength(2);
    expect(multiRunContext.runtimeContext.materializedConfiguredSkills.map((skill) => skill.name)).toEqual([
      toneSkillName,
      outlineSkillName,
    ]);
    const multiMaterializedByName = new Map(
      multiRunContext.runtimeContext.materializedConfiguredSkills.map((skill) => [skill.name, skill]),
    );
    await expectMaterializedSkillSymlink({
      materialized: multiMaterializedByName.get(toneSkillName),
      expectedName: toneSkillName,
      expectedSourceRootPath: toneSkillDir,
      expectedContent: "Codex tone private skill content",
    });
    await expectMaterializedSkillSymlink({
      materialized: multiMaterializedByName.get(outlineSkillName),
      expectedName: outlineSkillName,
      expectedSourceRootPath: outlineSkillDir,
      expectedContent: "Codex outline private skill content",
    });
    await expect(fs.readdir(path.join(workspaceRoot, ".codex", "skills"))).resolves.toEqual(
      expect.arrayContaining([rootSkillName, toneSkillName, outlineSkillName]),
    );
  });

  it("passes imported private root and multi-skill paths to the AutoByteus runtime config", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-private-skills-workspace-${unique}-`));
    const memoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-private-skills-memory-${unique}-`));
    cleanupPaths.add(workspaceRoot);
    cleanupPaths.add(memoryRoot);

    const rootAgentId = `autobyteus-root-agent-${unique}`;
    const multiAgentId = `autobyteus-multi-agent-${unique}`;
    const rootSkillName = `autobyteus_root_${unique}`;
    const toneSkillName = `autobyteus_tone_${unique}`;
    const outlineSkillName = `autobyteus_outline_${unique}`;

    const rootAgentDir = await writeAgentDefinition(externalRoot, rootAgentId, {
      name: "AutoByteus Runtime Root Private Skill Agent",
      description: "Uses one colocated private skill at the agent root",
      instructions: "Use the root private skill.",
      skillNames: [rootSkillName],
    });
    await writeSkillDirectory(
      rootAgentDir,
      rootSkillName,
      "AutoByteus runtime root private skill",
      "AutoByteus root private skill content",
    );

    const multiAgentDir = await writeAgentDefinition(externalRoot, multiAgentId, {
      name: "AutoByteus Runtime Multi Private Skill Agent",
      description: "Uses multiple private skills from the skills folder",
      instructions: "Use the private skills folder.",
      skillNames: [toneSkillName, outlineSkillName],
    });
    const toneSkillDir = await writeSkillDirectory(
      path.join(multiAgentDir, "skills", toneSkillName),
      toneSkillName,
      "AutoByteus runtime tone private skill",
      "AutoByteus tone private skill content",
    );
    const outlineSkillDir = await writeSkillDirectory(
      path.join(multiAgentDir, "skills", outlineSkillName),
      outlineSkillName,
      "AutoByteus runtime outline private skill",
      "AutoByteus outline private skill content",
    );

    const imported = await importLocalPackage(execGraphql, externalRoot);
    expect(imported.sharedAgentCount).toBe(2);
    await AgentDefinitionService.getInstance().refreshCache();
    SkillService.resetInstance();

    const { factory, capturedConfigs } = createAutoByteusRuntimeProbe(workspaceRoot);
    const workspaceId = "runtime_ws_private_skills";

    const rootRunId = `autobyteus-root-run-${unique}`;
    const rootBackend = await factory.createBackend(
      createRuntimeRunConfig({
        agentDefinitionId: rootAgentId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceId,
        memoryDir: path.join(memoryRoot, rootRunId),
      }),
      rootRunId,
    );
    expect(capturedConfigs.get(rootRunId)?.skills).toEqual([path.resolve(rootAgentDir)]);
    expect(capturedConfigs.get(rootRunId)?.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
    expect(rootBackend.getContext().config.workspaceId).toBe(workspaceId);
    await rootBackend.terminate();

    const multiRunId = `autobyteus-multi-run-${unique}`;
    const multiBackend = await factory.createBackend(
      createRuntimeRunConfig({
        agentDefinitionId: multiAgentId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceId,
        memoryDir: path.join(memoryRoot, multiRunId),
      }),
      multiRunId,
    );
    expect(capturedConfigs.get(multiRunId)?.skills).toEqual([
      path.resolve(toneSkillDir),
      path.resolve(outlineSkillDir),
    ]);
    expect(capturedConfigs.get(multiRunId)?.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
    expect(multiBackend.getContext().config.workspaceId).toBe(workspaceId);
    await multiBackend.terminate();
  });
  it("imports shared agents with colocated, multi-skill, context-bound private, and global fallback skills without global leakage", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);

    const rootAgentId = `shared-root-${unique}`;
    const multiAgentId = `shared-multi-${unique}`;
    const foreignPrivateAgentId = `foreign-private-${unique}`;
    const rootSkillName = `root_private_${unique}`;
    const toneSkillName = `tone_${unique}`;
    const outlineSkillName = `outline_${unique}`;
    const globalSkillName = `global_fallback_${unique}`;

    await writeSkillDirectory(
      path.join(dataRoot, "skills", globalSkillName),
      globalSkillName,
      "Global fallback skill",
      "Global fallback content",
    );

    const rootAgentDir = await writeAgentDefinition(externalRoot, rootAgentId, {
      name: "Shared Root Private Skill Agent",
      description: "Uses colocated root skill",
      instructions: "Use the colocated skill.",
      skillNames: [rootSkillName],
    });
    await writeSkillDirectory(
      rootAgentDir,
      rootSkillName,
      "Shared root private skill",
      "Root private skill content",
    );

    const multiAgentDir = await writeAgentDefinition(externalRoot, multiAgentId, {
      name: "Shared Multi Private Skill Agent",
      description: "Uses private multi-skill layout",
      instructions: "Use multiple private skills.",
      skillNames: [toneSkillName, outlineSkillName, globalSkillName],
    });
    await writeSkillDirectory(
      path.join(multiAgentDir, "skills", toneSkillName),
      toneSkillName,
      "Shared private tone skill",
      "Tone content",
    );
    await writeSkillDirectory(
      path.join(multiAgentDir, "skills", outlineSkillName),
      outlineSkillName,
      "Shared private outline skill",
      "Outline content",
    );

    await writeAgentDefinition(externalRoot, foreignPrivateAgentId, {
      name: "Foreign Private Skill Guard Agent",
      description: "Must not resolve another agent's private skill",
      instructions: "Do not resolve a private skill from another agent directory.",
      skillNames: [rootSkillName],
    });

    const imported = await importLocalPackage(execGraphql, externalRoot);
    expect(imported.sharedAgentCount).toBe(3);
    await AgentDefinitionService.getInstance().refreshCache();
    SkillService.resetInstance();

    await expect(resolveAgentSkillDescriptions(rootAgentId)).resolves.toEqual([
      "Shared root private skill",
    ]);
    await expect(resolveAgentSkillDescriptions(multiAgentId)).resolves.toEqual([
      "Shared private tone skill",
      "Shared private outline skill",
      "Global fallback skill",
    ]);
    const foreignWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(resolveAgentSkillDescriptions(foreignPrivateAgentId)).resolves.toEqual([]);
    expect(foreignWarnSpy).toHaveBeenCalledWith(expect.stringContaining(rootSkillName));
    foreignWarnSpy.mockRestore();

    const catalog = await execGraphql<{
      skills: Array<{ name: string }>;
      rootPrivate: { name: string } | null;
      tonePrivate: { name: string } | null;
      globalFallback: { name: string } | null;
    }>(
      `
        query SkillCatalog($rootSkillName: String!, $toneSkillName: String!, $globalSkillName: String!) {
          skills { name }
          rootPrivate: skill(name: $rootSkillName) { name }
          tonePrivate: skill(name: $toneSkillName) { name }
          globalFallback: skill(name: $globalSkillName) { name }
        }
      `,
      {
        rootSkillName,
        toneSkillName,
        globalSkillName,
      },
    );

    const catalogNames = catalog.skills.map((skill) => skill.name);
    expect(catalogNames).toContain(globalSkillName);
    expect(catalogNames).not.toContain(rootSkillName);
    expect(catalogNames).not.toContain(toneSkillName);
    expect(catalog.rootPrivate).toBeNull();
    expect(catalog.tonePrivate).toBeNull();
    expect(catalog.globalFallback?.name).toBe(globalSkillName);
  });

  it("imports team-local private and team-shared skills with context guards plus warn-and-skip guards", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);

    const teamId = `team-${unique}`;
    const rootLocalAgentId = `local-root-${unique}`;
    const multiLocalAgentId = `local-multi-${unique}`;
    const sharedFallbackAgentId = `team-shared-${unique}`;
    const foreignLocalAgentId = `foreign-local-${unique}`;
    const invalidAgentId = `invalid-skill-names-${unique}`;

    const localRootSkillName = `local_root_${unique}`;
    const localToneSkillName = `local_tone_${unique}`;
    const localOutlineSkillName = `local_outline_${unique}`;
    const teamSharedSkillName = `team_shared_${unique}`;
    const mismatchAgentSkillName = `mismatch_agent_${unique}`;
    const mismatchTeamSkillName = `mismatch_team_${unique}`;

    const teamDir = await writeTeamDefinition(externalRoot, teamId, {
      name: "Package Team With Private Skills",
      description: "Team package with team-local private skills",
      instructions: "Coordinate skill validation.",
      members: [
        rootLocalAgentId,
        multiLocalAgentId,
        sharedFallbackAgentId,
        foreignLocalAgentId,
        invalidAgentId,
      ],
    });

    const localRootAgentDir = await writeTeamLocalAgentDefinition(
      externalRoot,
      teamId,
      rootLocalAgentId,
      {
        name: "Team Local Root Skill Agent",
        description: "Uses colocated team-local root skill",
        instructions: "Use local root skill.",
        skillNames: [localRootSkillName],
      },
    );
    await writeSkillDirectory(
      localRootAgentDir,
      localRootSkillName,
      "Team-local root private skill",
      "Local root content",
    );

    const multiLocalAgentDir = await writeTeamLocalAgentDefinition(
      externalRoot,
      teamId,
      multiLocalAgentId,
      {
        name: "Team Local Multi Skill Agent",
        description: "Uses team-local multi private skills",
        instructions: "Use local multi skills.",
        skillNames: [localToneSkillName, localOutlineSkillName],
      },
    );
    await writeSkillDirectory(
      path.join(multiLocalAgentDir, "skills", localToneSkillName),
      localToneSkillName,
      "Team-local private tone skill",
      "Local tone content",
    );
    await writeSkillDirectory(
      path.join(multiLocalAgentDir, "skills", localOutlineSkillName),
      localOutlineSkillName,
      "Team-local private outline skill",
      "Local outline content",
    );

    await writeTeamLocalAgentDefinition(externalRoot, teamId, sharedFallbackAgentId, {
      name: "Team Shared Fallback Skill Agent",
      description: "Uses owning team shared skill",
      instructions: "Use team shared skill.",
      skillNames: [teamSharedSkillName],
    });
    await writeSkillDirectory(
      path.join(teamDir, "skills", teamSharedSkillName),
      teamSharedSkillName,
      "Owning team shared skill",
      "Team shared content",
    );

    await writeTeamLocalAgentDefinition(externalRoot, teamId, foreignLocalAgentId, {
      name: "Foreign Team-Local Private Skill Guard Agent",
      description: "Must not resolve another team-local agent's private skill",
      instructions: "Do not resolve a private skill from another local agent directory.",
      skillNames: [localRootSkillName],
    });

    const invalidAgentDir = await writeTeamLocalAgentDefinition(
      externalRoot,
      teamId,
      invalidAgentId,
      {
        name: "Invalid Configured Skill Names Agent",
        description: "Uses invalid and mismatched skill names",
        instructions: "Skip invalid skills.",
        skillNames: ["../escape", "a/b", "a\\b", ".", "..", "", mismatchAgentSkillName, mismatchTeamSkillName],
      },
    );
    await writeSkillDirectory(
      path.join(invalidAgentDir, "escape"),
      "../escape",
      "Should not resolve by traversal",
      "Unsafe content",
    );
    await writeSkillDirectory(
      path.join(invalidAgentDir, "skills", mismatchAgentSkillName),
      `wrong_${mismatchAgentSkillName}`,
      "Wrong agent-private metadata",
      "Wrong agent-private content",
    );
    await writeSkillDirectory(
      path.join(teamDir, "skills", mismatchTeamSkillName),
      `wrong_${mismatchTeamSkillName}`,
      "Wrong team-shared metadata",
      "Wrong team-shared content",
    );

    const imported = await importLocalPackage(execGraphql, externalRoot);
    expect(imported.agentTeamCount).toBe(1);
    expect(imported.teamLocalAgentCount).toBe(5);
    await AgentDefinitionService.getInstance().refreshCache();
    SkillService.resetInstance();

    const rootDefinitionId = buildTeamLocalAgentDefinitionId(teamId, rootLocalAgentId);
    const multiDefinitionId = buildTeamLocalAgentDefinitionId(teamId, multiLocalAgentId);
    const sharedFallbackDefinitionId = buildTeamLocalAgentDefinitionId(teamId, sharedFallbackAgentId);
    const foreignLocalDefinitionId = buildTeamLocalAgentDefinitionId(teamId, foreignLocalAgentId);
    const invalidDefinitionId = buildTeamLocalAgentDefinitionId(teamId, invalidAgentId);

    await expect(resolveAgentSkillDescriptions(rootDefinitionId)).resolves.toEqual([
      "Team-local root private skill",
    ]);
    await expect(resolveAgentSkillDescriptions(multiDefinitionId)).resolves.toEqual([
      "Team-local private tone skill",
      "Team-local private outline skill",
    ]);
    await expect(resolveAgentSkillDescriptions(sharedFallbackDefinitionId)).resolves.toEqual([
      "Owning team shared skill",
    ]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(resolveAgentSkillDescriptions(foreignLocalDefinitionId)).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(localRootSkillName));
    await expect(resolveAgentSkillDescriptions(invalidDefinitionId)).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping unsafe configured skill name '../escape'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping unsafe configured skill name 'a/b'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping unsafe configured skill name 'a\\b'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`wrong_${mismatchAgentSkillName}`));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`wrong_${mismatchTeamSkillName}`));

    const catalog = await execGraphql<{
      skills: Array<{ name: string }>;
      localRoot: { name: string } | null;
      teamShared: { name: string } | null;
    }>(
      `
        query TeamSkillCatalog($localRootSkillName: String!, $teamSharedSkillName: String!) {
          skills { name }
          localRoot: skill(name: $localRootSkillName) { name }
          teamShared: skill(name: $teamSharedSkillName) { name }
        }
      `,
      {
        localRootSkillName,
        teamSharedSkillName,
      },
    );

    const catalogNames = catalog.skills.map((skill) => skill.name);
    expect(catalogNames).not.toContain(localRootSkillName);
    expect(catalogNames).not.toContain(teamSharedSkillName);
    expect(catalog.localRoot).toBeNull();
    expect(catalog.teamShared).toBeNull();
  });
});
