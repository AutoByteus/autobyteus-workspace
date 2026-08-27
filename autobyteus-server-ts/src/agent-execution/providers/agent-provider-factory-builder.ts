import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../skills/services/skill-service.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { AgentToolMcpSessionIssuer } from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import {
  AutoByteusAgentRunBackendFactory,
  type AutoByteusAgentFactoryLike,
  type AutoByteusAgentIdleWaiter,
  type AutoByteusLlmFactory,
  type CompactionAgentRunnerFactory,
  type ProcessorRegistries,
} from "../backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { CodexAgentRunBackendFactory } from "../backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../backends/codex/backend/codex-thread-bootstrapper.js";
import type { CodexThreadCleanup } from "../backends/codex/backend/codex-thread-cleanup.js";
import type { CodexWorkspaceResolver } from "../backends/codex/codex-workspace-resolver.js";
import type { CodexThreadManager } from "../backends/codex/thread/codex-thread-manager.js";
import type { WorkspaceSkillMaterializer } from "../backends/shared/workspace-skill-materializer.js";
import type { CodexAppServerClientManager } from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import { ClaudeAgentRunBackendFactory } from "../backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../backends/claude/backend/claude-session-bootstrapper.js";
import type { ClaudeWorkspaceResolver } from "../backends/claude/claude-workspace-resolver.js";
import { ClaudeSessionManager } from "../backends/claude/session/claude-session-manager.js";
import type { ClaudeSdkClient } from "../../runtime-management/claude/client/claude-sdk-client.js";
import type { ApplicationAgentToolCapability } from "../../application-agent-tools/services/application-agent-tool-capability.js";

export type AgentProviderFactoryBuilderProcessInput = Readonly<{
  workspaceManager: WorkspaceManager;
  skillService: SkillService;
  autoByteus: Readonly<{
    agentFactory: AutoByteusAgentFactoryLike;
    createLlm: AutoByteusLlmFactory;
    processorRegistries: Readonly<ProcessorRegistries>;
    waitForIdle: AutoByteusAgentIdleWaiter;
    compactionAgentRunnerFactory: CompactionAgentRunnerFactory;
  }>;
  codex: Readonly<{
    workspaceSkillMaterializer: WorkspaceSkillMaterializer;
    workspaceResolver: CodexWorkspaceResolver;
    clientManager: CodexAppServerClientManager;
    threadManager: CodexThreadManager;
    threadCleanup: CodexThreadCleanup;
  }>;
  claude: Readonly<{
    workspaceResolver: ClaudeWorkspaceResolver;
    workspaceSkillMaterializer: WorkspaceSkillMaterializer;
    sdkClient: ClaudeSdkClient;
  }>;
}>;

export type AgentProviderFactorySet = Readonly<{
  autoByteus: AutoByteusAgentRunBackendFactory;
  codex: CodexAgentRunBackendFactory;
  claude: ClaudeAgentRunBackendFactory;
}>;

export interface AgentProviderFactoryBuilder {
  createForExecution(input: Readonly<{
    agentDefinitionService: AgentDefinitionService;
    agentToolMcpSessionIssuer: AgentToolMcpSessionIssuer;
    applicationAgentTools?: ApplicationAgentToolCapability | null;
  }>): AgentProviderFactorySet;
}

const requireRecord = (
  value: unknown,
  field: string,
): Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    throw new Error(`Agent provider factory builder ${field} is required.`);
  }
  return value as Record<string, unknown>;
};

const requireLeaf = (value: unknown, field: string): void => {
  if (value == null) {
    throw new Error(`Agent provider factory builder ${field} is required.`);
  }
};

const freezeProcessInput = (
  input: AgentProviderFactoryBuilderProcessInput,
): AgentProviderFactoryBuilderProcessInput => {
  requireRecord(input, "input");
  requireLeaf(input.workspaceManager, "workspaceManager");
  requireLeaf(input.skillService, "skillService");
  const autoByteus = requireRecord(input.autoByteus, "autoByteus");
  const registries = requireRecord(
    autoByteus.processorRegistries,
    "autoByteus.processorRegistries",
  );
  for (const field of [
    "agentFactory",
    "createLlm",
    "waitForIdle",
    "compactionAgentRunnerFactory",
  ] as const) {
    requireLeaf(autoByteus[field], `autoByteus.${field}`);
  }
  for (const field of [
    "input",
    "llmResponse",
    "toolExecutionResult",
    "toolInvocationPreprocessor",
    "lifecycle",
  ] as const) {
    requireLeaf(registries[field], `autoByteus.processorRegistries.${field}`);
  }
  const codex = requireRecord(input.codex, "codex");
  for (const field of [
    "workspaceSkillMaterializer",
    "workspaceResolver",
    "clientManager",
    "threadManager",
    "threadCleanup",
  ] as const) {
    requireLeaf(codex[field], `codex.${field}`);
  }
  const claude = requireRecord(input.claude, "claude");
  for (const field of [
    "workspaceResolver",
    "workspaceSkillMaterializer",
    "sdkClient",
  ] as const) {
    requireLeaf(claude[field], `claude.${field}`);
  }

  return Object.freeze({
    workspaceManager: input.workspaceManager,
    skillService: input.skillService,
    autoByteus: Object.freeze({
      ...input.autoByteus,
      processorRegistries: Object.freeze({
        ...input.autoByteus.processorRegistries,
      }),
    }),
    codex: Object.freeze({ ...input.codex }),
    claude: Object.freeze({ ...input.claude }),
  });
};

export const createAgentProviderFactoryBuilder = (
  rawInput: AgentProviderFactoryBuilderProcessInput,
): AgentProviderFactoryBuilder => {
  const process = freezeProcessInput(rawInput);
  return Object.freeze({
    createForExecution: (input: Readonly<{
      agentDefinitionService: AgentDefinitionService;
      agentToolMcpSessionIssuer: AgentToolMcpSessionIssuer;
      applicationAgentTools?: ApplicationAgentToolCapability | null;
    }>): AgentProviderFactorySet => {
      requireRecord(input, "execution input");
      requireLeaf(input.agentDefinitionService, "agentDefinitionService");
      requireLeaf(input.agentToolMcpSessionIssuer, "agentToolMcpSessionIssuer");

      const codexBootstrapper = new CodexThreadBootstrapper(
        process.codex.workspaceSkillMaterializer,
        process.codex.workspaceResolver,
        input.agentDefinitionService,
        process.skillService,
        process.codex.clientManager,
        input.agentToolMcpSessionIssuer,
      );
      const claudeSessionManager = new ClaudeSessionManager(
        process.workspaceManager,
        process.claude.sdkClient,
        input.agentToolMcpSessionIssuer,
        process.claude.workspaceSkillMaterializer,
      );
      return Object.freeze({
        autoByteus: new AutoByteusAgentRunBackendFactory({
          agentFactory: process.autoByteus.agentFactory,
          agentDefinitionService: input.agentDefinitionService,
          createLLM: process.autoByteus.createLlm,
          workspaceManager: process.workspaceManager,
          skillService: process.skillService,
          registries: process.autoByteus.processorRegistries,
          waitForIdle: process.autoByteus.waitForIdle,
          compactionAgentRunnerFactory:
            process.autoByteus.compactionAgentRunnerFactory,
          applicationAgentTools: input.applicationAgentTools ?? null,
        }),
        codex: new CodexAgentRunBackendFactory(
          process.codex.threadManager,
          codexBootstrapper,
          process.codex.threadCleanup,
        ),
        claude: new ClaudeAgentRunBackendFactory(
          claudeSessionManager,
          new ClaudeSessionBootstrapper(
            process.claude.workspaceResolver,
            process.claude.workspaceSkillMaterializer,
            input.agentDefinitionService,
            process.skillService,
          ),
        ),
      });
    },
  });
};
