import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { DefaultCodexThreadBootstrapStrategy } from "../../../../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.js";
import { CodexThreadBootstrapper } from "../../../../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
} from "../../../../../../src/agent-tools/browser/browser-tool-contract.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { Skill } from "../../../../../../src/skills/domain/models.js";
import type { CodexWorkspaceSkillMaterializer } from "../../../../../../src/agent-execution/backends/codex/codex-workspace-skill-materializer.js";
import type { CodexWorkspaceResolver } from "../../../../../../src/agent-execution/backends/codex/codex-workspace-resolver.js";
import type { AgentDefinitionService } from "../../../../../../src/agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../../../../src/skills/services/skill-service.js";
import type { CodexThreadBootstrapStrategy } from "../../../../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.js";
import type { CodexAppServerClientManager } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";

const WORKING_DIRECTORY = "/tmp/codex-workspace";

const createRunContext = () =>
  new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      workspaceId: "workspace-id",
      llmConfig: null,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    }),
    runtimeContext: null,
  });

const createSkill = (name: string) =>
  new Skill({
    name,
    description: `${name} description`,
    content: `# ${name}`,
    rootPath: path.join("/tmp", name),
  });

const createMaterializerMock = () => ({
  materializeConfiguredCodexWorkspaceSkills: vi.fn(async (input: {
    workingDirectory: string;
    configuredSkills?: Skill[] | null;
  }) =>
    (input.configuredSkills ?? []).map((skill) => ({
      name: skill.name,
      sourceRootPath: skill.rootPath,
      materializedRootPath: path.join(input.workingDirectory, ".codex", "skills", skill.name),
      registryKey: `${input.workingDirectory}::${skill.rootPath}`,
    }))),
}) as unknown as CodexWorkspaceSkillMaterializer;

const createBootstrapper = (input: {
  skills: Skill[];
  requestImplementation: () => Promise<unknown>;
  toolNames?: string[];
}) => {
  const workspaceSkillMaterializer = createMaterializerMock();
  const workspaceResolver = {
    resolveWorkingDirectory: vi.fn(async () => WORKING_DIRECTORY),
  } as unknown as CodexWorkspaceResolver;
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(async () => ({
      skillNames: input.skills.map((skill) => skill.name),
      toolNames: input.toolNames ?? [],
      instructions: null,
      description: null,
    })),
  } as unknown as AgentDefinitionService;
  const skillService = {
    getSkills: vi.fn(async () => input.skills),
  } as unknown as SkillService;
  const client = {
    request: vi.fn(input.requestImplementation),
  };
  const clientManager = {
    acquireClient: vi.fn(async () => client),
    releaseClient: vi.fn(async () => undefined),
  } as unknown as CodexAppServerClientManager;
  const teamStrategy = {
    appliesTo: () => false,
    prepare: async () => {
      throw new Error("team strategy should not be used in this test");
    },
  } as CodexThreadBootstrapStrategy;
  const bootstrapper = new CodexThreadBootstrapper(
    workspaceSkillMaterializer,
    workspaceResolver,
    agentDefinitionService,
    skillService,
    new DefaultCodexThreadBootstrapStrategy(),
    teamStrategy,
    clientManager,
  );

  return {
    bootstrapper,
    workspaceSkillMaterializer,
    client,
    clientManager,
  };
};

describe("CodexThreadBootstrapper", () => {
  const originalBrowserBridgeBaseUrl = process.env[BROWSER_BRIDGE_BASE_URL_ENV];
  const originalBrowserBridgeToken = process.env[BROWSER_BRIDGE_TOKEN_ENV];

  beforeEach(() => {
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    if (typeof originalBrowserBridgeBaseUrl === "string") {
      process.env[BROWSER_BRIDGE_BASE_URL_ENV] = originalBrowserBridgeBaseUrl;
    } else {
      delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    }
    if (typeof originalBrowserBridgeToken === "string") {
      process.env[BROWSER_BRIDGE_TOKEN_ENV] = originalBrowserBridgeToken;
    } else {
      delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
    }
  });

  it("filters out configured skills that Codex already discovers by name", async () => {
    const skill = createSkill("installed_skill");
    const { bootstrapper, workspaceSkillMaterializer, clientManager } = createBootstrapper({
      skills: [skill],
      requestImplementation: async () => ({
        data: [
          {
            cwd: WORKING_DIRECTORY,
            skills: [
              {
                name: "installed_skill",
                enabled: true,
                path: "/Users/normy/.codex/skills/installed_skill/SKILL.md",
                scope: "user",
              },
            ],
            errors: [],
          },
        ],
      }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(
      workspaceSkillMaterializer.materializeConfiguredCodexWorkspaceSkills,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        workingDirectory: WORKING_DIRECTORY,
        configuredSkills: [],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      }),
    );
    expect(runContext.runtimeContext.materializedConfiguredSkills).toEqual([]);
    expect(clientManager.releaseClient).toHaveBeenCalledWith(WORKING_DIRECTORY);
  });

  it("falls back to workspace materialization when the discoverable-skill probe fails", async () => {
    const skill = createSkill("missing_skill");
    const { bootstrapper, workspaceSkillMaterializer, clientManager } = createBootstrapper({
      skills: [skill],
      requestImplementation: async () => {
        throw new Error("skills/list failed");
      },
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(
      workspaceSkillMaterializer.materializeConfiguredCodexWorkspaceSkills,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        workingDirectory: WORKING_DIRECTORY,
        configuredSkills: [skill],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      }),
    );
    expect(runContext.runtimeContext.materializedConfiguredSkills).toHaveLength(1);
    expect(clientManager.releaseClient).toHaveBeenCalledWith(WORKING_DIRECTORY);
  });

  it("does not expose browser dynamic tools unless both bridge env and browser toolNames are present", async () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";
    process.env[BROWSER_BRIDGE_TOKEN_ENV] = "browser-token";

    const { bootstrapper: noBrowserToolBootstrapper } = createBootstrapper({
      skills: [],
      toolNames: [],
      requestImplementation: async () => ({ data: [] }),
    });

    const noBrowserToolRunContext = await noBrowserToolBootstrapper.bootstrapForCreate(
      createRunContext(),
    );

    expect(noBrowserToolRunContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();

    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];

    const { bootstrapper: noBridgeBootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["open_tab"],
      requestImplementation: async () => ({ data: [] }),
    });

    const noBridgeRunContext = await noBridgeBootstrapper.bootstrapForCreate(createRunContext());

    expect(noBridgeRunContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
  });

  it("exposes only the configured browser dynamic tools when bridge env is available", async () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";
    process.env[BROWSER_BRIDGE_TOKEN_ENV] = "browser-token";

    const { bootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["open_tab", "read_page", "send_message_to"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());
    const dynamicToolSpecs = runContext.runtimeContext.codexThreadConfig.dynamicTools;

    expect(dynamicToolSpecs).not.toBeNull();
    expect(dynamicToolSpecs?.map((spec) => spec.name)).toEqual(["open_tab", "read_page"]);
  });

  it("exposes publish_artifact as a Codex dynamic tool only when the agent config allows it", async () => {
    const { bootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["publish_artifact"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());
    const dynamicToolSpecs = runContext.runtimeContext.codexThreadConfig.dynamicTools;

    expect(dynamicToolSpecs).not.toBeNull();
    expect(dynamicToolSpecs?.map((spec) => spec.name)).toEqual(["publish_artifact"]);
  });
});
