import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import {
  CodexThreadBootstrapper,
  normalizeSandboxMode,
  resolveEffectiveCodexSandboxMode,
} from "../../../../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { CodexAgentRunContext } from "../../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexApprovalPolicy } from "../../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
} from "../../../../../../src/agent-tools/browser/browser-tool-contract.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { Skill } from "../../../../../../src/skills/domain/models.js";
import type { WorkspaceSkillMaterializer } from "../../../../../../src/agent-execution/backends/shared/workspace-skill-materializer.js";
import type { ConfiguredAgentSkillBinding } from "../../../../../../src/skills/domain/configured-agent-skill-binding.js";
import type { CodexWorkspaceResolver } from "../../../../../../src/agent-execution/backends/codex/codex-workspace-resolver.js";
import type { AgentDefinitionService } from "../../../../../../src/agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../../../../src/skills/services/skill-service.js";
import type { CodexAppServerClientManager } from "../../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import type { AgentToolMcpRunSessionActivator } from "../../../../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { AgentToolMcpDescriptor } from "../../../../../../src/agent-tools/mcp/agent-tool-mcp-session.js";
import { testMemberTeamContext } from "../../../../../fixtures/current-team-run-fixtures.js";

const WORKING_DIRECTORY = "/tmp/codex-workspace";

const createRunContext = (input: {
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools?: boolean;
  memberTeamContext?: MemberTeamContext | null;
  llmModelIdentifier?: string;
} = {}) =>
  new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def",
      llmModelIdentifier: input.llmModelIdentifier ?? "gpt-test",
      autoExecuteTools: input.autoExecuteTools ?? false,
      workspaceId: "workspace-id",
      llmConfig: input.llmConfig ?? null,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      memberTeamContext: input.memberTeamContext ?? null,
    }),
    runtimeContext: null,
  });

const createRestoreRunContext = (input: {
  llmConfig?: Record<string, unknown> | null;
  autoExecuteTools?: boolean;
  memberTeamContext?: MemberTeamContext | null;
} = {}) =>
  new AgentRunContext({
    runId: "run-restore",
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: input.autoExecuteTools ?? false,
      workspaceId: "workspace-id",
      llmConfig: input.llmConfig ?? null,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      memberTeamContext: input.memberTeamContext ?? null,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: "gpt-test",
        workingDirectory: WORKING_DIRECTORY,
        reasoningEffort: "medium",
        serviceTier: null,
        approvalPolicy: CodexApprovalPolicy.ON_REQUEST,
        sandbox: "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: null,
      },
      threadId: "thread-existing",
    }),
  });

const createMemberTeamContext = () =>
  testMemberTeamContext({
    teamRunId: "team-1",
    rootTeamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    memberAddress: "/ping",
    coordinatorAddress: "/ping",
    agentRunId: "ping-run-1",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    deliverInterAgentMessage: vi.fn(async () => undefined) as any,
  });

const createSkill = (name: string) =>
  new Skill({
    name,
    description: `${name} description`,
    content: `# ${name}`,
    rootPath: path.join("/tmp", name),
  });

const SUPPORTED_AGENT_TOOLS_MCP_TEST_NAMES = new Set([
  "send_message_to",
  "open_tab",
  "read_page",
  "generate_image",
  "generate_speech",
  "publish_artifacts",
]);

const createAgentToolMcpDescriptor = (enabledTools: string[] = ["send_message_to"]): AgentToolMcpDescriptor => ({
  name: "autobyteus_agent_tools",
  transport: "streamable_http",
  serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-codex",
  enabledTools,
});

const createMaterializerMock = () => ({
  materializeConfiguredWorkspaceSkills: vi.fn(async (input: {
    workingDirectory: string;
    requests?: Array<{ kind: string; skill?: Skill }> | null;
  }) =>
    (input.requests ?? []).filter((request) => request.kind === "expose-resolved").map((request) => ({
      name: request.skill!.name,
      sourceRootPath: request.skill!.rootPath,
      materializedRootPath: path.join(input.workingDirectory, ".codex", "skills", request.skill!.name),
      registryKey: `${input.workingDirectory}::${request.skill!.rootPath}`,
    }))),
}) as unknown as WorkspaceSkillMaterializer;

const createBootstrapper = (input: {
  skills: Skill[];
  bindings?: ConfiguredAgentSkillBinding[];
  requestImplementation: () => Promise<unknown>;
  toolNames?: string[];
  agentToolsDescriptor?: AgentToolMcpDescriptor;
  materializeImplementation?: WorkspaceSkillMaterializer["materializeConfiguredWorkspaceSkills"];
}) => {
  const workspaceSkillMaterializer = createMaterializerMock();
  if (input.materializeImplementation) {
    workspaceSkillMaterializer.materializeConfiguredWorkspaceSkills = vi.fn(
      input.materializeImplementation,
    );
  }
  const workspaceResolver = {
    resolveWorkingDirectory: vi.fn(async () => WORKING_DIRECTORY),
  } as unknown as CodexWorkspaceResolver;
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn(async () => ({
      skillNames: (input.bindings ?? input.skills.map((skill) => ({ kind: "resolved" as const, skill })))
        .map((binding) => binding.kind === "resolved" ? binding.skill.name : binding.name),
      toolNames: input.toolNames ?? [],
      name: "Codex test agent",
      instructions: "Run the test.",
      description: "Test agent",
    })),
  } as unknown as AgentDefinitionService;
  const skillService = {
    resolveConfiguredSkillBindingsForAgent: vi.fn(() =>
      input.bindings ?? input.skills.map((skill) => ({ kind: "resolved" as const, skill }))),
  } as unknown as SkillService;
  const client = {
    request: vi.fn(input.requestImplementation),
  };
  const clientManager = {
    acquireClient: vi.fn(async () => client),
    releaseClient: vi.fn(async () => undefined),
  } as unknown as CodexAppServerClientManager;
  const agentToolMcpRunSessions = {
    activateForRun: vi.fn((issueInput) => {
      const descriptor = input.agentToolsDescriptor ?? createAgentToolMcpDescriptor(
        (input.toolNames ?? []).filter((toolName) => SUPPORTED_AGENT_TOOLS_MCP_TEST_NAMES.has(toolName)),
      );
      return descriptor.enabledTools.length === 0
        ? ({ kind: "not_exposed" as const })
        : ({
            kind: "active" as const,
            sessionId: "session-codex",
            owner: issueInput.owner,
            descriptor,
          });
    }),
  } as AgentToolMcpRunSessionActivator;
  const bootstrapper = new CodexThreadBootstrapper(
    agentToolMcpRunSessions,
    workspaceSkillMaterializer,
    workspaceResolver,
    agentDefinitionService,
    skillService,
    clientManager,
  );

  return {
    bootstrapper,
    workspaceSkillMaterializer,
    client,
    clientManager,
    agentToolMcpRunSessions,
  };
};

describe("CodexThreadBootstrapper", () => {
  const originalBrowserBridgeBaseUrl = process.env[BROWSER_BRIDGE_BASE_URL_ENV];
  const originalBrowserBridgeToken = process.env[BROWSER_BRIDGE_TOKEN_ENV];
  const originalCodexSandboxMode = process.env.CODEX_APP_SERVER_SANDBOX;
  const originalCodexApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;

  beforeEach(() => {
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
    delete process.env.CODEX_APP_SERVER_SANDBOX;
    delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
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
    if (typeof originalCodexSandboxMode === "string") {
      process.env.CODEX_APP_SERVER_SANDBOX = originalCodexSandboxMode;
    } else {
      delete process.env.CODEX_APP_SERVER_SANDBOX;
    }
    if (typeof originalCodexApprovalPolicy === "string") {
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = originalCodexApprovalPolicy;
    } else {
      delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
    }
  });

  it("resolves Codex sandbox mode from the shared setting normalizer", () => {
    process.env.CODEX_APP_SERVER_SANDBOX = " read-only ";
    expect(normalizeSandboxMode()).toBe("read-only");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.CODEX_APP_SERVER_SANDBOX = "invalid-mode";

    expect(normalizeSandboxMode()).toBe("workspace-write");
    expect(warnSpy).toHaveBeenCalledWith(
      "Invalid CODEX_APP_SERVER_SANDBOX 'invalid-mode', falling back to 'workspace-write'.",
    );

    warnSpy.mockRestore();
  });

  it("uses danger-full-access as the effective Codex sandbox for auto-approved runs", async () => {
    process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

    expect(resolveEffectiveCodexSandboxMode(false)).toBe("workspace-write");
    expect(resolveEffectiveCodexSandboxMode(true)).toBe("danger-full-access");

    const { bootstrapper } = createBootstrapper({
      skills: [],
      requestImplementation: async () => ({ data: [] }),
    });
    const runContext = await bootstrapper.bootstrapForCreate(
      createRunContext({ autoExecuteTools: true }),
    );

    expect(runContext.runtimeContext.codexThreadConfig.approvalPolicy).toBe("never");
    expect(runContext.runtimeContext.codexThreadConfig.sandbox).toBe("danger-full-access");
  });

  it("keeps danger-full-access as the effective Codex sandbox when restoring auto-approved runs", async () => {
    process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

    const { bootstrapper } = createBootstrapper({
      skills: [],
      requestImplementation: async () => ({ data: [] }),
    });
    const runContext = await bootstrapper.bootstrapForRestore(
      createRestoreRunContext({ autoExecuteTools: true }),
    );

    expect(runContext.runtimeContext.threadId).toBe("thread-existing");
    expect(runContext.runtimeContext.codexThreadConfig.approvalPolicy).toBe("never");
    expect(runContext.runtimeContext.codexThreadConfig.sandbox).toBe("danger-full-access");
  });

  it("gives Codex team-member auto mode the high-trust thread config for create and restore", async () => {
    process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";

    const { bootstrapper } = createBootstrapper({
      skills: [],
      requestImplementation: async () => ({ data: [] }),
    });
    const memberTeamContext = createMemberTeamContext();

    const createdRunContext = await bootstrapper.bootstrapForCreate(
      createRunContext({ autoExecuteTools: true, memberTeamContext }),
    );
    const restoredRunContext = await bootstrapper.bootstrapForRestore(
      createRestoreRunContext({ autoExecuteTools: true, memberTeamContext }),
    );

    expect(createdRunContext.runtimeContext.codexThreadConfig.approvalPolicy).toBe("never");
    expect(createdRunContext.runtimeContext.codexThreadConfig.sandbox).toBe("danger-full-access");
    expect(createdRunContext.runtimeContext.codexThreadConfig.baseInstructions).toContain(
      "## AgentTeam Addressing",
    );
    expect(createdRunContext.runtimeContext.codexThreadConfig.baseInstructions).toContain(
      "## AgentTeam Collaboration",
    );
    expect(createdRunContext.runtimeContext.codexThreadConfig.baseInstructions).not.toContain(
      "## Team Runtime",
    );
    expect(createdRunContext.runtimeContext.codexThreadConfig.baseInstructions).not.toContain(
      "## Working Environment",
    );
    expect(createdRunContext.runtimeContext.codexThreadConfig.baseInstructions).not.toContain(
      "## Bash Operating Practice",
    );
    expect(createdRunContext.runtimeContext.codexThreadConfig.baseInstructions).not.toContain(
      "## File And Directory Practice",
    );
    expect(restoredRunContext.runtimeContext.threadId).toBe("thread-existing");
    expect(restoredRunContext.runtimeContext.codexThreadConfig.approvalPolicy).toBe("never");
    expect(restoredRunContext.runtimeContext.codexThreadConfig.sandbox).toBe("danger-full-access");
    expect(restoredRunContext.runtimeContext.codexThreadConfig.baseInstructions).toBe(
      createdRunContext.runtimeContext.codexThreadConfig.baseInstructions,
    );
  });

  it("keeps configured approval and sandbox settings for Codex team-member manual mode", async () => {
    process.env.CODEX_APP_SERVER_SANDBOX = "read-only";
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";

    const { bootstrapper } = createBootstrapper({
      skills: [],
      requestImplementation: async () => ({ data: [] }),
    });
    const memberTeamContext = createMemberTeamContext();

    const createdRunContext = await bootstrapper.bootstrapForCreate(
      createRunContext({ autoExecuteTools: false, memberTeamContext }),
    );

    expect(createdRunContext.runtimeContext.codexThreadConfig.approvalPolicy).toBe("untrusted");
    expect(createdRunContext.runtimeContext.codexThreadConfig.sandbox).toBe("read-only");
  });

  it("reconciles configured skills that Codex already discovers by name", async () => {
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
      workspaceSkillMaterializer.materializeConfiguredWorkspaceSkills,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        workingDirectory: WORKING_DIRECTORY,
        runId: "run-1",
        requests: [{ kind: "reconcile-discoverable", skill }],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      }),
    );
    expect(runContext.runtimeContext.materializedConfiguredSkills).toEqual([]);
    expect(clientManager.releaseClient).toHaveBeenCalledWith(WORKING_DIRECTORY);
  });

  it("maps every binding exactly once while discovery changes only resolved request intent", async () => {
    const installed = createSkill("installed_skill");
    const missing = createSkill("missing_skill");
    const bindings: ConfiguredAgentSkillBinding[] = [
      { kind: "resolved", skill: installed },
      { kind: "unresolved", name: "unresolved_skill" },
      { kind: "resolved", skill: missing },
    ];
    const { bootstrapper, workspaceSkillMaterializer } = createBootstrapper({
      skills: [installed, missing],
      bindings,
      requestImplementation: async () => ({
        data: [{ cwd: WORKING_DIRECTORY, skills: [{ name: installed.name, enabled: true }], errors: [] }],
      }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(workspaceSkillMaterializer.materializeConfiguredWorkspaceSkills).toHaveBeenCalledWith({
      runId: "run-1",
      workingDirectory: WORKING_DIRECTORY,
      requests: [
        { kind: "reconcile-discoverable", skill: installed },
        { kind: "reconcile-unresolved", name: "unresolved_skill" },
        { kind: "expose-resolved", skill: missing },
      ],
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    });
    expect(runContext.runtimeContext.materializedConfiguredSkills).toHaveLength(1);
  });

  it("normalizes llmConfig service_tier into Codex thread serviceTier", async () => {
    const { bootstrapper } = createBootstrapper({
      skills: [],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(
      createRunContext({
        llmConfig: {
          reasoning_effort: "high",
          service_tier: " FAST ",
        },
      }),
    );

    expect(runContext.runtimeContext.codexThreadConfig.reasoningEffort).toBe("high");
    expect(runContext.runtimeContext.codexThreadConfig.serviceTier).toBe("fast");
  });

  it("passes gpt-5.6-luna to Codex thread configuration unchanged", async () => {
    const { bootstrapper } = createBootstrapper({
      skills: [],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext({
      llmModelIdentifier: "gpt-5.6-luna",
    }));

    expect(runContext.runtimeContext.codexThreadConfig.model).toBe("gpt-5.6-luna");
  });

  it.each([
    ["max", "max"],
    [" ultra ", "ultra"],
    [" Future-Custom ", "Future-Custom"],
  ])(
    "preserves open reasoning effort %j in Codex thread config",
    async (submittedEffort, expectedEffort) => {
      const { bootstrapper } = createBootstrapper({
        skills: [],
        requestImplementation: async () => ({ data: [] }),
      });

      const runContext = await bootstrapper.bootstrapForCreate(
        createRunContext({
          llmConfig: {
            reasoning_effort: submittedEffort,
          },
        }),
      );

      expect(runContext.runtimeContext.codexThreadConfig.reasoningEffort).toBe(
        expectedEffort,
      );
    },
  );

  it.each([
    ["unset", null],
    ["whitespace-only", { reasoning_effort: "   " }],
    ["non-string", { reasoning_effort: 42 }],
  ])(
    "keeps %s reasoning effort unset in Codex thread config",
    async (_label, llmConfig) => {
      const { bootstrapper } = createBootstrapper({
        skills: [],
        requestImplementation: async () => ({ data: [] }),
      });

      const runContext = await bootstrapper.bootstrapForCreate(
        createRunContext({ llmConfig }),
      );

      expect(
        runContext.runtimeContext.codexThreadConfig.reasoningEffort,
      ).toBeNull();
    },
  );

  it("falls back to workspace materialization when the discoverable-skill probe fails", async () => {
    const skill = createSkill("missing_skill");
    const { bootstrapper, workspaceSkillMaterializer, clientManager } = createBootstrapper({
      skills: [skill],
      bindings: [
        { kind: "resolved", skill },
        { kind: "unresolved", name: "still_missing" },
      ],
      requestImplementation: async () => {
        throw new Error("skills/list failed");
      },
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(
      workspaceSkillMaterializer.materializeConfiguredWorkspaceSkills,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        workingDirectory: WORKING_DIRECTORY,
        runId: "run-1",
        requests: [
          { kind: "expose-resolved", skill },
          { kind: "reconcile-unresolved", name: "still_missing" },
        ],
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      }),
    );
    expect(runContext.runtimeContext.materializedConfiguredSkills).toHaveLength(1);
    expect(clientManager.releaseClient).toHaveBeenCalledWith(WORKING_DIRECTORY);
  });

  it("does not materialize Agent Tools MCP browser config unless browser tools are available", async () => {
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
      agentToolsDescriptor: createAgentToolMcpDescriptor([]),
      requestImplementation: async () => ({ data: [] }),
    });

    const noBridgeRunContext = await noBridgeBootstrapper.bootstrapForCreate(createRunContext());

    expect(noBridgeRunContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
  });

  it("materializes standalone send_message_to through Agent Tools MCP thread config", async () => {
    const { bootstrapper, agentToolMcpRunSessions } = createBootstrapper({
      skills: [],
      toolNames: ["send_message_to"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(runContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
    expect(runContext.runtimeContext.codexThreadConfig.appServerConfig).toEqual({
      mcp_servers: {
        autobyteus_agent_tools: {
          url: "http://127.0.0.1:3000/mcp/agent-tools/session-codex",
          enabled_tools: ["send_message_to"],
          startup_timeout_sec: 5,
        },
      },
    });
    expect(agentToolMcpRunSessions.activateForRun).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { runId: "run-1" },
        sender: expect.objectContaining({
          senderRunId: "run-1",
          senderName: "agent-def",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          memberTeamContext: null,
        }),
      }),
    );
  });

  it("recreates Agent Tools MCP thread config on restore instead of reusing persisted descriptors", async () => {
    const { bootstrapper, agentToolMcpRunSessions } = createBootstrapper({
      skills: [],
      toolNames: ["send_message_to"],
      agentToolsDescriptor: {
        ...createAgentToolMcpDescriptor(),
        serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-restored",
      },
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForRestore(createRestoreRunContext());

    expect(runContext.runtimeContext.threadId).toBe("thread-existing");
    expect(agentToolMcpRunSessions.activateForRun).toHaveBeenCalledTimes(1);
    expect(runContext.runtimeContext.codexThreadConfig.appServerConfig).toMatchObject({
      mcp_servers: {
        autobyteus_agent_tools: {
          url: "http://127.0.0.1:3000/mcp/agent-tools/session-restored",
          enabled_tools: ["send_message_to"],
        },
      },
    });
  });

  it("leaves the activated run resource for the run owner when later workspace preparation fails", async () => {
    const skill = createSkill("post_issue_failure");
    const { bootstrapper, agentToolMcpRunSessions } = createBootstrapper({
      skills: [skill],
      toolNames: ["send_message_to"],
      requestImplementation: async () => ({ data: [] }),
      materializeImplementation: async () => {
        throw new Error("workspace materialization failed after issue");
      },
    });

    await expect(bootstrapper.bootstrapForCreate(createRunContext())).rejects.toThrow(
      "workspace materialization failed after issue",
    );
    expect(agentToolMcpRunSessions.activateForRun).toHaveBeenCalledTimes(1);
    expect(agentToolMcpRunSessions.activateForRun).toHaveBeenCalledWith(
      expect.objectContaining({ owner: { runId: "run-1" } }),
    );
  });

  it("does not materialize Agent Tools MCP config when no configured tool is available", async () => {
    const { bootstrapper, agentToolMcpRunSessions } = createBootstrapper({
      skills: [],
      toolNames: ["open_tab"],
      agentToolsDescriptor: createAgentToolMcpDescriptor([]),
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(runContext.runtimeContext.codexThreadConfig.appServerConfig).toBeNull();
    expect(agentToolMcpRunSessions.activateForRun).toHaveBeenCalledTimes(1);
  });

  it("exposes configured browser tools only through Agent Tools MCP when allowed", async () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";
    process.env[BROWSER_BRIDGE_TOKEN_ENV] = "browser-token";

    const { bootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["send_message_to", "open_tab", "read_page"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());
    expect(runContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
    expect(runContext.runtimeContext.codexThreadConfig.appServerConfig).toMatchObject({
      mcp_servers: {
        autobyteus_agent_tools: {
          url: "http://127.0.0.1:3000/mcp/agent-tools/session-codex",
          enabled_tools: ["send_message_to", "open_tab", "read_page"],
        },
      },
    });
  });

  it("exposes publish_artifacts only through Agent Tools MCP when the agent config allows it", async () => {
    const { bootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["publish_artifacts"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(runContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
    expect(runContext.runtimeContext.codexThreadConfig.appServerConfig).toMatchObject({
      mcp_servers: {
        autobyteus_agent_tools: {
          enabled_tools: ["publish_artifacts"],
        },
      },
    });
  });

  it("exposes only configured media tools through Agent Tools MCP for Codex", async () => {
    const { bootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["generate_image", "generate_speech", "read_file"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(runContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
    expect(runContext.runtimeContext.codexThreadConfig.appServerConfig).toMatchObject({
      mcp_servers: {
        autobyteus_agent_tools: {
          enabled_tools: ["generate_image", "generate_speech"],
        },
      },
    });
  });

  it("does not expose artifact publication for old singular-only Codex configs", async () => {
    const { bootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["publish_artifact"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(runContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
  });

  it("exposes only the plural artifact Agent Tools MCP tool for mixed old/new Codex configs", async () => {
    const { bootstrapper } = createBootstrapper({
      skills: [],
      toolNames: ["publish_artifacts", "publish_artifact"],
      requestImplementation: async () => ({ data: [] }),
    });

    const runContext = await bootstrapper.bootstrapForCreate(createRunContext());

    expect(runContext.runtimeContext.codexThreadConfig.dynamicTools).toBeNull();
    expect(runContext.runtimeContext.codexThreadConfig.appServerConfig).toMatchObject({
      mcp_servers: {
        autobyteus_agent_tools: {
          enabled_tools: ["publish_artifacts"],
        },
      },
    });
  });

});
