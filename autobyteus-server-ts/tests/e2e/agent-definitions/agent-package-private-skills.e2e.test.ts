import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import type { AgentConfig } from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AutoByteusAgentRunBackendFactory } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE } from "../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";
import { WorkspaceSkillMaterializer, type MaterializedWorkspaceSkill } from "../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import type { CodexWorkspaceResolver } from "../../../src/agent-execution/backends/codex/codex-workspace-resolver.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import type { AgentToolMcpRunSessionActivator } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";

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
  const agentToolMcpRunSessions = {
    activateForRun: vi.fn(() => ({ kind: "not_exposed" as const })),
  } satisfies AgentToolMcpRunSessionActivator;
  return new CodexThreadBootstrapper(
    agentToolMcpRunSessions,
    new WorkspaceSkillMaterializer(CODEX_WORKSPACE_SKILL_MATERIALIZATION_PROFILE),
    workspaceResolver,
    AgentDefinitionService.getInstance(),
    SkillService.getInstance(),
    clientManager,
  );
};

const expectMaterializedSkillSymlink = async (input: {
  materialized: MaterializedWorkspaceSkill | undefined;
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
    createLLM: vi.fn(async () => ({})),
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
    compactionAgentRunnerFactory: vi.fn(async () => ({
      runCompactionTask: vi.fn(async () => ({ outputText: "unused in config probe" })),
    })),
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


  it("materializes imported shared-agent canonical single-skill and multi-skill layouts for Codex runtime", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), `codex-private-skills-workspace-${unique}-`));
    cleanupPaths.add(workspaceRoot);

    const singleAgentId = `codex-single-agent-${unique}`;
    const multiAgentId = `codex-multi-agent-${unique}`;
    const singleSkillName = `codex_single_${unique}`;
    const toneSkillName = `codex_tone_${unique}`;
    const outlineSkillName = `codex_outline_${unique}`;

    const singleAgentDir = await writeAgentDefinition(externalRoot, singleAgentId, {
      name: "Codex Runtime Single Private Skill Agent",
      description: "Uses one canonical private skill folder",
      instructions: "Use the canonical private skill.",
      skillNames: [singleSkillName],
    });
    const singleSkillDir = await writeSkillDirectory(
      path.join(singleAgentDir, "skills", singleSkillName),
      singleSkillName,
      "Codex runtime single private skill",
      "Codex single private skill content",
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
    const singleRunContext = await bootstrapper.bootstrapForCreate(
      createCodexRunContext({
        runId: `codex-single-run-${unique}`,
        agentDefinitionId: singleAgentId,
        workspaceId: "runtime_ws_private_skills",
      }),
    );
    expect(singleRunContext.runtimeContext.materializedConfiguredSkills).toHaveLength(1);
    const singleMaterializedByName = new Map(
      singleRunContext.runtimeContext.materializedConfiguredSkills.map((skill) => [skill.name, skill]),
    );
    await expectMaterializedSkillSymlink({
      materialized: singleMaterializedByName.get(singleSkillName),
      expectedName: singleSkillName,
      expectedSourceRootPath: singleSkillDir,
      expectedContent: "Codex single private skill content",
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
      expect.arrayContaining([singleSkillName, toneSkillName, outlineSkillName]),
    );
  });

  it("passes imported canonical single-skill and multi-skill paths to the AutoByteus runtime config", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-private-skills-workspace-${unique}-`));
    const memoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-private-skills-memory-${unique}-`));
    cleanupPaths.add(workspaceRoot);
    cleanupPaths.add(memoryRoot);

    const singleAgentId = `autobyteus-single-agent-${unique}`;
    const multiAgentId = `autobyteus-multi-agent-${unique}`;
    const singleSkillName = `autobyteus_single_${unique}`;
    const toneSkillName = `autobyteus_tone_${unique}`;
    const outlineSkillName = `autobyteus_outline_${unique}`;

    const singleAgentDir = await writeAgentDefinition(externalRoot, singleAgentId, {
      name: "AutoByteus Runtime Single Private Skill Agent",
      description: "Uses one canonical private skill folder",
      instructions: "Use the canonical private skill.",
      skillNames: [singleSkillName],
    });
    const singleSkillDir = await writeSkillDirectory(
      path.join(singleAgentDir, "skills", singleSkillName),
      singleSkillName,
      "AutoByteus runtime single private skill",
      "AutoByteus single private skill content",
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

    const singleRunId = `autobyteus-single-run-${unique}`;
    const singleBackend = await factory.createBackend(
      createRuntimeRunConfig({
        agentDefinitionId: singleAgentId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        workspaceId,
        memoryDir: path.join(memoryRoot, singleRunId),
      }),
      singleRunId,
    );
    expect(capturedConfigs.get(singleRunId)?.skills).toEqual([path.resolve(singleSkillDir)]);
    expect(capturedConfigs.get(singleRunId)?.skillAccessMode).toBe(SkillAccessMode.PRELOADED_ONLY);
    expect(singleBackend.getContext().config.workspaceId).toBe(workspaceId);
    await singleBackend.terminate();

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
  it("imports shared agents with canonical single-skill, multi-skill, context-bound private, and global fallback skills with catalog visibility", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);

    const singleAgentId = `shared-single-${unique}`;
    const multiAgentId = `shared-multi-${unique}`;
    const foreignPrivateAgentId = `foreign-private-${unique}`;
    const singleSkillName = `single_private_${unique}`;
    const toneSkillName = `tone_${unique}`;
    const outlineSkillName = `outline_${unique}`;
    const globalSkillName = `global_fallback_${unique}`;

    await writeSkillDirectory(
      path.join(dataRoot, "skills", globalSkillName),
      globalSkillName,
      "Global fallback skill",
      "Global fallback content",
    );

    const singleAgentDir = await writeAgentDefinition(externalRoot, singleAgentId, {
      name: "Shared Single Private Skill Agent",
      description: "Uses one canonical private skill folder",
      instructions: "Use the canonical private skill.",
      skillNames: [singleSkillName],
    });
    const singleSkillDir = await writeSkillDirectory(
      path.join(singleAgentDir, "skills", singleSkillName),
      singleSkillName,
      "Shared single private skill",
      "Single private skill content",
    );

    const multiAgentDir = await writeAgentDefinition(externalRoot, multiAgentId, {
      name: "Shared Multi Private Skill Agent",
      description: "Uses private multi-skill layout",
      instructions: "Use multiple private skills.",
      skillNames: [toneSkillName, outlineSkillName, globalSkillName],
    });
    const toneSkillDir = await writeSkillDirectory(
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
      skillNames: [singleSkillName],
    });

    const imported = await importLocalPackage(execGraphql, externalRoot);
    expect(imported.sharedAgentCount).toBe(3);
    await AgentDefinitionService.getInstance().refreshCache();
    SkillService.resetInstance();

    await expect(resolveAgentSkillDescriptions(singleAgentId)).resolves.toEqual([
      "Shared single private skill",
    ]);
    await expect(resolveAgentSkillDescriptions(multiAgentId)).resolves.toEqual([
      "Shared private tone skill",
      "Shared private outline skill",
      "Global fallback skill",
    ]);
    const foreignWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(resolveAgentSkillDescriptions(foreignPrivateAgentId)).resolves.toEqual([]);
    expect(foreignWarnSpy).toHaveBeenCalledWith(expect.stringContaining(singleSkillName));
    foreignWarnSpy.mockRestore();

    const catalog = await execGraphql<{
      skills: Array<{ name: string; rootPath: string }>;
      singlePrivate: { name: string; rootPath: string; content: string; fileCount: number } | null;
      tonePrivate: { name: string; rootPath: string; content: string; fileCount: number } | null;
      globalFallback: { name: string } | null;
      singlePrivateTree: string | null;
      singlePrivateFile: string | null;
      tonePrivateFile: string | null;
      singlePrivateWorkspaceTree: string | null;
      singlePrivateWorkspaceFile: string | null;
      tonePrivateWorkspaceFile: string | null;
    }>(
      `
        query SkillCatalog(
          $singleSkillName: String!
          $toneSkillName: String!
          $globalSkillName: String!
          $singleSkillWorkspaceId: String!
          $toneSkillWorkspaceId: String!
        ) {
          skills { name rootPath }
          singlePrivate: skill(name: $singleSkillName) { name rootPath content fileCount }
          tonePrivate: skill(name: $toneSkillName) { name rootPath content fileCount }
          globalFallback: skill(name: $globalSkillName) { name }
          singlePrivateTree: skillFileTree(name: $singleSkillName)
          singlePrivateFile: skillFileContent(skillName: $singleSkillName, path: "SKILL.md")
          tonePrivateFile: skillFileContent(skillName: $toneSkillName, path: "SKILL.md")
          singlePrivateWorkspaceTree: folderChildren(workspaceId: $singleSkillWorkspaceId, folderPath: "")
          singlePrivateWorkspaceFile: fileContent(workspaceId: $singleSkillWorkspaceId, filePath: "SKILL.md")
          tonePrivateWorkspaceFile: fileContent(workspaceId: $toneSkillWorkspaceId, filePath: "SKILL.md")
        }
      `,
      {
        singleSkillName,
        toneSkillName,
        globalSkillName,
        singleSkillWorkspaceId: `skill_ws_${singleSkillName}`,
        toneSkillWorkspaceId: `skill_ws_${toneSkillName}`,
      },
    );

    const catalogNames = catalog.skills.map((skill) => skill.name);
    expect(catalogNames).toContain(globalSkillName);
    expect(catalogNames).toContain(singleSkillName);
    expect(catalogNames).toContain(toneSkillName);
    expect(catalog.singlePrivate?.name).toBe(singleSkillName);
    expect(catalog.singlePrivate?.rootPath).toBe(path.resolve(singleSkillDir));
    expect(catalog.singlePrivate?.content).toContain("Single private skill content");
    expect(catalog.singlePrivate?.fileCount).toBeGreaterThanOrEqual(1);
    expect(catalog.tonePrivate?.name).toBe(toneSkillName);
    expect(catalog.tonePrivate?.rootPath).toBe(path.resolve(toneSkillDir));
    expect(catalog.tonePrivate?.content).toContain("Tone content");
    expect(catalog.globalFallback?.name).toBe(globalSkillName);
    expect(catalog.singlePrivateFile).toContain("Single private skill content");
    expect(catalog.tonePrivateFile).toContain("Tone content");
    expect(JSON.parse(catalog.singlePrivateTree ?? "{}").children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "SKILL.md", is_file: true }),
      ]),
    );
    expect(catalog.singlePrivateWorkspaceFile).toContain("Single private skill content");
    expect(catalog.tonePrivateWorkspaceFile).toContain("Tone content");
    expect(JSON.parse(catalog.singlePrivateWorkspaceTree ?? "{}").children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "SKILL.md", is_file: true }),
      ]),
    );
  });

  it("imports team-local private and team-shared skills with context guards plus warn-and-skip guards", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const { externalRoot } = await bootstrapPackageService(unique);

    const teamId = `team-${unique}`;
    const singleLocalAgentId = `local-single-${unique}`;
    const multiLocalAgentId = `local-multi-${unique}`;
    const sharedFallbackAgentId = `team-shared-${unique}`;
    const foreignLocalAgentId = `foreign-local-${unique}`;
    const invalidAgentId = `invalid-skill-names-${unique}`;

    const localSingleSkillName = `local_single_${unique}`;
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
        singleLocalAgentId,
        multiLocalAgentId,
        sharedFallbackAgentId,
        foreignLocalAgentId,
        invalidAgentId,
      ],
    });

    const localSingleAgentDir = await writeTeamLocalAgentDefinition(
      externalRoot,
      teamId,
      singleLocalAgentId,
      {
        name: "Team Local Single Skill Agent",
        description: "Uses one canonical team-local private skill folder",
        instructions: "Use local single skill.",
        skillNames: [localSingleSkillName],
      },
    );
    const localSingleSkillDir = await writeSkillDirectory(
      path.join(localSingleAgentDir, "skills", localSingleSkillName),
      localSingleSkillName,
      "Team-local single private skill",
      "Local single content",
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
    const localToneSkillDir = await writeSkillDirectory(
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
    const teamSharedSkillDir = await writeSkillDirectory(
      path.join(teamDir, "skills", teamSharedSkillName),
      teamSharedSkillName,
      "Owning team shared skill",
      "Team shared content",
    );

    await writeTeamLocalAgentDefinition(externalRoot, teamId, foreignLocalAgentId, {
      name: "Foreign Team-Local Private Skill Guard Agent",
      description: "Must not resolve another team-local agent's private skill",
      instructions: "Do not resolve a private skill from another local agent directory.",
      skillNames: [localSingleSkillName],
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

    const singleDefinitionId = buildTeamLocalAgentDefinitionId(teamId, singleLocalAgentId);
    const multiDefinitionId = buildTeamLocalAgentDefinitionId(teamId, multiLocalAgentId);
    const sharedFallbackDefinitionId = buildTeamLocalAgentDefinitionId(teamId, sharedFallbackAgentId);
    const foreignLocalDefinitionId = buildTeamLocalAgentDefinitionId(teamId, foreignLocalAgentId);
    const invalidDefinitionId = buildTeamLocalAgentDefinitionId(teamId, invalidAgentId);

    await expect(resolveAgentSkillDescriptions(singleDefinitionId)).resolves.toEqual([
      "Team-local single private skill",
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
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(localSingleSkillName));
    await expect(resolveAgentSkillDescriptions(invalidDefinitionId)).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping unsafe configured skill name '../escape'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping unsafe configured skill name 'a/b'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping unsafe configured skill name 'a\\b'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`wrong_${mismatchAgentSkillName}`));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`wrong_${mismatchTeamSkillName}`));

    const catalog = await execGraphql<{
      skills: Array<{ name: string }>;
      localSingle: { name: string; rootPath: string; content: string } | null;
      localTone: { name: string; rootPath: string; content: string } | null;
      teamShared: { name: string; rootPath: string; content: string } | null;
      teamSharedTree: string | null;
      teamSharedFile: string | null;
      teamSharedWorkspaceTree: string | null;
      teamSharedWorkspaceFile: string | null;
    }>(
      `
        query TeamSkillCatalog(
          $localSingleSkillName: String!
          $localToneSkillName: String!
          $teamSharedSkillName: String!
          $teamSharedWorkspaceId: String!
        ) {
          skills { name }
          localSingle: skill(name: $localSingleSkillName) { name rootPath content }
          localTone: skill(name: $localToneSkillName) { name rootPath content }
          teamShared: skill(name: $teamSharedSkillName) { name rootPath content }
          teamSharedTree: skillFileTree(name: $teamSharedSkillName)
          teamSharedFile: skillFileContent(skillName: $teamSharedSkillName, path: "SKILL.md")
          teamSharedWorkspaceTree: folderChildren(workspaceId: $teamSharedWorkspaceId, folderPath: "")
          teamSharedWorkspaceFile: fileContent(workspaceId: $teamSharedWorkspaceId, filePath: "SKILL.md")
        }
      `,
      {
        localSingleSkillName,
        localToneSkillName,
        teamSharedSkillName,
        teamSharedWorkspaceId: `skill_ws_${teamSharedSkillName}`,
      },
    );

    const catalogNames = catalog.skills.map((skill) => skill.name);
    expect(catalogNames).toEqual(expect.arrayContaining([
      localSingleSkillName,
      localToneSkillName,
      localOutlineSkillName,
      teamSharedSkillName,
    ]));
    expect(catalog.localSingle?.rootPath).toBe(path.resolve(localSingleSkillDir));
    expect(catalog.localSingle?.content).toContain("Local single content");
    expect(catalog.localTone?.rootPath).toBe(path.resolve(localToneSkillDir));
    expect(catalog.localTone?.content).toContain("Local tone content");
    expect(catalog.teamShared?.rootPath).toBe(path.resolve(teamSharedSkillDir));
    expect(catalog.teamShared?.content).toContain("Team shared content");
    expect(catalog.teamSharedFile).toContain("Team shared content");
    expect(JSON.parse(catalog.teamSharedTree ?? "{}").children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "SKILL.md", is_file: true }),
      ]),
    );
    expect(catalog.teamSharedWorkspaceFile).toContain("Team shared content");
    expect(JSON.parse(catalog.teamSharedWorkspaceTree ?? "{}").children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "SKILL.md", is_file: true }),
      ]),
    );
  });
});
