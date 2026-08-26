import { describe, expect, it, vi } from "vitest";
import {
  createAgentProviderFactoryBuilder,
  type AgentProviderFactoryBuilderProcessInput,
} from "../../../src/agent-execution/providers/agent-provider-factory-builder.js";
import { createProcessAgentProviderFactoryBuilder } from "../../../src/compositions/create-process-agent-provider-factory-builder.js";

const createProcessInput = (): AgentProviderFactoryBuilderProcessInput => ({
  workspaceManager: { marker: "workspace" } as never,
  skillService: { marker: "skills" } as never,
  autoByteus: {
    agentFactory: { marker: "agent-factory" } as never,
    createLlm: vi.fn() as never,
    processorRegistries: {
      input: { marker: "input" } as never,
      llmResponse: { marker: "llm-response" } as never,
      toolExecutionResult: { marker: "tool-result" } as never,
      toolInvocationPreprocessor: { marker: "tool-preprocessor" } as never,
      lifecycle: { marker: "lifecycle" } as never,
    },
    waitForIdle: vi.fn() as never,
    compactionAgentRunnerFactory: vi.fn() as never,
  },
  codex: {
    workspaceSkillMaterializer: { marker: "codex-materializer" } as never,
    workspaceResolver: { marker: "codex-resolver" } as never,
    clientManager: { marker: "codex-client" } as never,
    threadManager: { marker: "codex-thread-manager" } as never,
    threadCleanup: { marker: "codex-thread-cleanup" } as never,
  },
  claude: {
    workspaceResolver: { marker: "claude-resolver" } as never,
    workspaceSkillMaterializer: { marker: "claude-materializer" } as never,
    sdkClient: { marker: "claude-client" } as never,
  },
});

const PROCESS_LEAVES = [
  "workspaceManager",
  "skillService",
  "autoByteus.agentFactory",
  "autoByteus.createLlm",
  "autoByteus.processorRegistries.input",
  "autoByteus.processorRegistries.llmResponse",
  "autoByteus.processorRegistries.toolExecutionResult",
  "autoByteus.processorRegistries.toolInvocationPreprocessor",
  "autoByteus.processorRegistries.lifecycle",
  "autoByteus.waitForIdle",
  "autoByteus.compactionAgentRunnerFactory",
  "codex.workspaceSkillMaterializer",
  "codex.workspaceResolver",
  "codex.clientManager",
  "codex.threadManager",
  "codex.threadCleanup",
  "claude.workspaceResolver",
  "claude.workspaceSkillMaterializer",
  "claude.sdkClient",
] as const;

const withLeaf = (
  input: AgentProviderFactoryBuilderProcessInput,
  path: string,
  value: unknown,
  omit: boolean,
): AgentProviderFactoryBuilderProcessInput => {
  const clone = structuredCloneForTest(input) as Record<string, unknown>;
  const segments = path.split(".");
  let parent = clone;
  for (const segment of segments.slice(0, -1)) {
    parent = parent[segment] as Record<string, unknown>;
  }
  const leaf = segments.at(-1)!;
  if (omit) delete parent[leaf];
  else parent[leaf] = value;
  return clone as AgentProviderFactoryBuilderProcessInput;
};

const structuredCloneForTest = (input: AgentProviderFactoryBuilderProcessInput) => ({
  ...input,
  autoByteus: {
    ...input.autoByteus,
    processorRegistries: { ...input.autoByteus.processorRegistries },
  },
  codex: { ...input.codex },
  claude: { ...input.claude },
});

describe("AgentProviderFactoryBuilder", () => {
  it("requires the root-selected workspace for process composition", () => {
    for (const input of [{}, { workspaceManager: null }, { workspaceManager: undefined }]) {
      expect(() => createProcessAgentProviderFactoryBuilder(input as never))
        .toThrow("Process Agent provider workspace manager is required.");
    }
  });

  it.each(PROCESS_LEAVES)("requires the exact process leaf %s", (path) => {
    for (const [label, value, omit] of [
      ["omitted", undefined, true],
      ["null", null, false],
      ["undefined", undefined, false],
    ] as const) {
      expect(() => createAgentProviderFactoryBuilder(
        withLeaf(createProcessInput(), path, value, omit),
      ), `${path} ${label}`).toThrow(`Agent provider factory builder ${path} is required.`);
    }
  });

  it("requires both execution inputs before provider construction", () => {
    const builder = createAgentProviderFactoryBuilder(createProcessInput());
    for (const field of ["agentDefinitionService", "agentToolMcpSessionIssuer"] as const) {
      for (const [label, value, omit] of [
        ["omitted", undefined, true],
        ["null", null, false],
        ["undefined", undefined, false],
      ] as const) {
        const input: Record<string, unknown> = {
          agentDefinitionService: {},
          agentToolMcpSessionIssuer: {},
        };
        if (omit) delete input[field];
        else input[field] = value;
        expect(() => builder.createForExecution(input as never), `${field} ${label}`)
          .toThrow(`Agent provider factory builder ${field} is required.`);
      }
    }
  });

  it("maps all collaborators exactly while sharing process leaves and isolating executions", () => {
    const process = createProcessInput();
    const builder = createAgentProviderFactoryBuilder(process);
    const definitionA = { marker: "definition-a" };
    const definitionB = { marker: "definition-b" };
    const issuerA = { issueForRun: vi.fn() };
    const issuerB = { issueForRun: vi.fn() };
    const first = builder.createForExecution({
      agentDefinitionService: definitionA as never,
      agentToolMcpSessionIssuer: issuerA as never,
    });
    const second = builder.createForExecution({
      agentDefinitionService: definitionB as never,
      agentToolMcpSessionIssuer: issuerB as never,
    });

    expect(Object.isFrozen(builder)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.autoByteus).not.toBe(second.autoByteus);
    expect(first.codex).not.toBe(second.codex);
    expect(first.claude).not.toBe(second.claude);

    const auto = first.autoByteus as unknown as Record<string, unknown>;
    expect(auto.agentFactory).toBe(process.autoByteus.agentFactory);
    expect(auto.agentDefinitionService).toBe(definitionA);
    expect(auto.createLLM).toBe(process.autoByteus.createLlm);
    expect(auto.workspaceManager).toBe(process.workspaceManager);
    expect(auto.skillService).toBe(process.skillService);
    expect(auto.registries).toEqual(process.autoByteus.processorRegistries);
    expect(auto.waitForIdle).toBe(process.autoByteus.waitForIdle);
    expect(auto.compactionAgentRunnerFactory)
      .toBe(process.autoByteus.compactionAgentRunnerFactory);

    const codex = first.codex as unknown as Record<string, unknown>;
    const codexBootstrapper = codex.threadBootstrapper as Record<string, unknown>;
    expect(codex.threadManager).toBe(process.codex.threadManager);
    expect(codex.threadCleanup).toBe(process.codex.threadCleanup);
    expect(codexBootstrapper.workspaceSkillMaterializer)
      .toBe(process.codex.workspaceSkillMaterializer);
    expect(codexBootstrapper.workspaceResolver).toBe(process.codex.workspaceResolver);
    expect(codexBootstrapper.agentDefinitionService).toBe(definitionA);
    expect(codexBootstrapper.skillService).toBe(process.skillService);
    expect(codexBootstrapper.clientManager).toBe(process.codex.clientManager);
    expect(codexBootstrapper.agentToolMcpSessionIssuer).toBe(issuerA);

    const claude = first.claude as unknown as Record<string, unknown>;
    const claudeManager = claude.sessionManager as Record<string, unknown>;
    const claudeBootstrapper = claude.sessionBootstrapper as Record<string, unknown>;
    expect(claudeManager.workspaceManager).toBe(process.workspaceManager);
    expect(claudeManager.sdkClient).toBe(process.claude.sdkClient);
    expect(claudeManager.agentToolMcpSessionIssuer).toBe(issuerA);
    expect((claudeManager.sessionCleanup as Record<string, unknown>)
      .workspaceSkillMaterializer).toBe(process.claude.workspaceSkillMaterializer);
    expect(claudeBootstrapper.workspaceResolver).toBe(process.claude.workspaceResolver);
    expect(claudeBootstrapper.workspaceSkillMaterializer)
      .toBe(process.claude.workspaceSkillMaterializer);
    expect(claudeBootstrapper.agentDefinitionService).toBe(definitionA);
    expect(claudeBootstrapper.skillService).toBe(process.skillService);

    const secondCodexBootstrapper = (second.codex as unknown as Record<string, unknown>)
      .threadBootstrapper as Record<string, unknown>;
    const secondClaudeManager = (second.claude as unknown as Record<string, unknown>)
      .sessionManager as Record<string, unknown>;
    expect(secondCodexBootstrapper).not.toBe(codexBootstrapper);
    expect(secondCodexBootstrapper.agentDefinitionService).toBe(definitionB);
    expect(secondCodexBootstrapper.agentToolMcpSessionIssuer).toBe(issuerB);
    expect(secondClaudeManager).not.toBe(claudeManager);
    expect(secondClaudeManager.agentToolMcpSessionIssuer).toBe(issuerB);
  });
});
