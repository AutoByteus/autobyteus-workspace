import {
  defaultAgentFactory,
  defaultInputProcessorRegistry,
  defaultLifecycleEventProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  waitForAgentToBeIdle,
} from "autobyteus-ts";
import type { WorkspaceManager } from "../workspaces/workspace-manager.js";
import { SkillService } from "../skills/services/skill-service.js";
import {
  createDefaultCompactionAgentRunner,
} from "../agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { createAvailableLlm } from "../agent-execution/backends/autobyteus/available-llm-construction.js";
import { getCodexWorkspaceSkillMaterializer } from "../agent-execution/backends/codex/codex-workspace-skill-materializer.js";
import { getCodexWorkspaceResolver } from "../agent-execution/backends/codex/codex-workspace-resolver.js";
import { getCodexAppServerClientManager } from "../runtime-management/codex/client/codex-app-server-client-manager.js";
import { getCodexThreadManager } from "../agent-execution/backends/codex/thread/codex-thread-manager.js";
import { getCodexThreadCleanup } from "../agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import { getClaudeWorkspaceResolver } from "../agent-execution/backends/claude/claude-workspace-resolver.js";
import { getClaudeWorkspaceSkillMaterializer } from "../agent-execution/backends/claude/claude-workspace-skill-materializer.js";
import { getClaudeSdkClient } from "../runtime-management/claude/client/claude-sdk-client.js";
import {
  createAgentProviderFactoryBuilder,
  type AgentProviderFactoryBuilder,
} from "../agent-execution/providers/agent-provider-factory-builder.js";

export const createProcessAgentProviderFactoryBuilder = (input: Readonly<{
  workspaceManager: WorkspaceManager;
}>): AgentProviderFactoryBuilder => {
  if (!input?.workspaceManager) {
    throw new Error("Process Agent provider workspace manager is required.");
  }
  return createAgentProviderFactoryBuilder({
    workspaceManager: input.workspaceManager,
    skillService: SkillService.getInstance(),
    autoByteus: {
      agentFactory: defaultAgentFactory,
      createLlm: createAvailableLlm,
      processorRegistries: {
        input: defaultInputProcessorRegistry,
        llmResponse: defaultLlmResponseProcessorRegistry,
        toolExecutionResult: defaultToolExecutionResultProcessorRegistry,
        toolInvocationPreprocessor: defaultToolInvocationPreprocessorRegistry,
        lifecycle: defaultLifecycleEventProcessorRegistry,
      },
      waitForIdle: waitForAgentToBeIdle,
      compactionAgentRunnerFactory: createDefaultCompactionAgentRunner,
    },
    codex: {
      workspaceSkillMaterializer: getCodexWorkspaceSkillMaterializer(),
      workspaceResolver: getCodexWorkspaceResolver(),
      clientManager: getCodexAppServerClientManager(),
      threadManager: getCodexThreadManager(),
      threadCleanup: getCodexThreadCleanup(),
    },
    claude: {
      workspaceResolver: getClaudeWorkspaceResolver(),
      workspaceSkillMaterializer: getClaudeWorkspaceSkillMaterializer(),
      sdkClient: getClaudeSdkClient(),
    },
  });
};
