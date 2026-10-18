import { preparePrivateRuntimeSkills } from "../../shared/prepare-private-runtime-skills.js";
import type { ProviderPreparationGuard } from "../../provider-preparation-guard.js";
import {
  workspaceCollisionPolicyForScope,
} from "../../shared/workspace-skill-collision-policy.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../../../../skills/services/skill-service.js";
import {
  getCodexWorkspaceResolver,
  type CodexWorkspaceResolver,
} from "../codex-workspace-resolver.js";
import { CodexAgentRunContext, type CodexRunContext } from "./codex-agent-run-context.js";
import {
  resolveCodexSessionReasoningEffort,
  resolveCodexSessionServiceTier,
} from "../codex-app-server-model-normalizer.js";
import {
  buildCodexThreadConfig,
  CodexApprovalPolicy,
  type CodexThreadConfig,
} from "../thread/codex-thread-config.js";
import {
  buildCodexDynamicToolHandlerMap,
  buildCodexDynamicToolSpecs,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import {
  CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
  DEFAULT_CODEX_SANDBOX_MODE,
  isCodexSandboxMode,
  normalizeCodexSandboxMode,
  type CodexSandboxMode,
} from "../../../../runtime-management/codex/codex-sandbox-mode-setting.js";
import {
  resolveRuntimeAgentToolExposure,
  type RuntimeAgentToolExposure,
} from "../../../shared/runtime-agent-tool-exposure.js";
import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import type {
  AgentToolMcpRunSessionActivator,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import {
  materializeCodexAgentToolsMcpThreadConfig,
} from "../agent-tools-mcp/codex-agent-tools-mcp-materializer.js";
import { composeSharedCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const resolveApprovalPolicyForAutoExecuteTools = (
  autoExecuteTools: boolean,
): CodexApprovalPolicy =>
  autoExecuteTools ? CodexApprovalPolicy.NEVER : CodexApprovalPolicy.ON_REQUEST;

const CODEX_APP_SERVER_APPROVAL_POLICY_SETTING_KEY = "CODEX_APP_SERVER_APPROVAL_POLICY";

const isCodexApprovalPolicy = (value: string): value is CodexApprovalPolicy =>
  Object.values(CodexApprovalPolicy).includes(value as CodexApprovalPolicy);

export const resolveConfiguredCodexApprovalPolicy = (): CodexApprovalPolicy | null => {
  const rawApprovalPolicy = process.env[CODEX_APP_SERVER_APPROVAL_POLICY_SETTING_KEY];
  const submittedApprovalPolicy =
    typeof rawApprovalPolicy === "string" ? rawApprovalPolicy.trim() : "";
  if (!submittedApprovalPolicy) {
    return null;
  }
  if (isCodexApprovalPolicy(submittedApprovalPolicy)) {
    return submittedApprovalPolicy;
  }
  logger.warn(
    `Invalid ${CODEX_APP_SERVER_APPROVAL_POLICY_SETTING_KEY} '${submittedApprovalPolicy}', falling back to Codex default approval policy.`,
  );
  return null;
};

export const resolveApprovalPolicyForRunConfig = (
  config: Pick<AgentRunConfig, "autoExecuteTools">,
): CodexApprovalPolicy => {
  if (config.autoExecuteTools) {
    return resolveApprovalPolicyForAutoExecuteTools(true);
  }
  return (
    resolveConfiguredCodexApprovalPolicy() ??
    resolveApprovalPolicyForAutoExecuteTools(false)
  );
};

export const normalizeSandboxMode = (): CodexSandboxMode => {
  const rawSandbox = process.env[CODEX_APP_SERVER_SANDBOX_SETTING_KEY];
  const sandbox = normalizeCodexSandboxMode(rawSandbox);
  const submittedSandbox = typeof rawSandbox === "string" ? rawSandbox.trim() : "";

  if (submittedSandbox.length > 0 && !isCodexSandboxMode(submittedSandbox)) {
    logger.warn(
      `Invalid ${CODEX_APP_SERVER_SANDBOX_SETTING_KEY} '${submittedSandbox}', falling back to '${DEFAULT_CODEX_SANDBOX_MODE}'.`,
    );
  }

  return sandbox;
};

const AUTO_APPROVED_CODEX_SANDBOX_MODE: CodexSandboxMode = "danger-full-access";

export const resolveEffectiveCodexSandboxMode = (
  autoExecuteTools: boolean,
): CodexSandboxMode =>
  autoExecuteTools ? AUTO_APPROVED_CODEX_SANDBOX_MODE : normalizeSandboxMode();

export const resolveEffectiveCodexSandboxModeForRunConfig = (
  config: Pick<AgentRunConfig, "autoExecuteTools">,
): CodexSandboxMode =>
  resolveEffectiveCodexSandboxMode(config.autoExecuteTools);

export const resolveDefaultModel = (): string | null => {
  const model = process.env.CODEX_APP_SERVER_MODEL;
  if (typeof model !== "string") {
    return null;
  }
  const normalized = model.trim();
  return normalized.length > 0 ? normalized : null;
};

export class CodexThreadBootstrapper {
  private readonly workspaceResolver: CodexWorkspaceResolver;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly skillService: SkillService;
  private readonly agentToolMcpRunSessions: AgentToolMcpRunSessionActivator;

  constructor(
    agentToolMcpRunSessions: AgentToolMcpRunSessionActivator,
    workspaceResolver: CodexWorkspaceResolver = getCodexWorkspaceResolver(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
  ) {
    if (!agentToolMcpRunSessions) {
      throw new Error("Codex Agent Tools MCP run-session activator is required.");
    }
    this.workspaceResolver = workspaceResolver;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
    this.agentToolMcpRunSessions = agentToolMcpRunSessions;
  }

  async bootstrapForCreate(
    runContext: AgentRunContext<null>,
    guard: ProviderPreparationGuard,
  ): Promise<CodexRunContext> {
    return this.bootstrapInternal(runContext, null, guard);
  }

  async bootstrapForRestore(
    runContext: AgentRunContext<CodexAgentRunContext>,
    guard: ProviderPreparationGuard,
  ): Promise<CodexRunContext> {
    return this.bootstrapInternal(runContext, runContext.runtimeContext, guard);
  }

  private async bootstrapInternal(
    runContext: AgentRunContext<CodexAgentRunContext | null>,
    existingRuntimeContext: CodexAgentRunContext | null,
    guard: ProviderPreparationGuard,
  ): Promise<CodexRunContext> {
    const workingDirectory = await this.workspaceResolver.resolveWorkingDirectory(
      runContext.config.workspaceId,
    );
    const agentDefinition = await this.agentDefinitionService.getAgentDefinitionById(
      runContext.config.agentDefinitionId,
    );
    if (!agentDefinition) {
      throw new Error(`Agent definition '${runContext.config.agentDefinitionId}' was not found.`);
    }
    const configuredSkillBindings =
      this.skillService.resolveConfiguredSkillBindingsForAgent(agentDefinition);
    const runtimeToolExposure = resolveRuntimeAgentToolExposure(
      agentDefinition,
      runContext.config.memberExecutionContext,
    );
    const carpenterSystemPrompt = composeSharedCarpenterPrompt({
      agentDefinition,
      memberExecutionContext: runContext.config.memberExecutionContext,
    });
    const dynamicToolRegistrations: CodexDynamicToolRegistration[] | null = null;
    guard.assertAccepting();
    const codexThreadConfig = this.buildThreadConfig({
      agentRunConfig: runContext.config,
      workingDirectory,
      baseInstructions: carpenterSystemPrompt,
      developerInstructions: null,
      appServerConfig: this.createAgentToolsMcpAppServerConfig({
        runContext,
        runtimeToolExposure,
        workingDirectory,
      }),
      dynamicToolRegistrations,
    });
    const privateSkillProfile = await preparePrivateRuntimeSkills({
      runtime: "codex", workingDirectory, memoryDir: runContext.config.memoryDir,
      bindings: configuredSkillBindings, skills: this.skillService, guard,
      collisionPolicy: workspaceCollisionPolicyForScope(this.skillService.resolveSkillScope(agentDefinition)),
    });
    return new AgentRunContext({
      runId: runContext.runId,
      config: runContext.config,
      runtimeContext: new CodexAgentRunContext({
        codexThreadConfig,
        privateSkillProfile,
        dynamicToolHandlers: buildCodexDynamicToolHandlerMap(
          dynamicToolRegistrations,
        ),
        threadId: existingRuntimeContext?.threadId ?? null,
        activeTurnId: existingRuntimeContext?.activeTurnId ?? null,
      }),
    });
  }

  private buildThreadConfig(input: {
    agentRunConfig: AgentRunConfig;
    workingDirectory: string;
    baseInstructions: string | null;
    developerInstructions: string | null;
    appServerConfig: ReturnType<typeof materializeCodexAgentToolsMcpThreadConfig> | null;
    dynamicToolRegistrations: CodexDynamicToolRegistration[] | null;
  }): CodexThreadConfig {
    return buildCodexThreadConfig({
      model: input.agentRunConfig.llmModelIdentifier ?? resolveDefaultModel(),
      workingDirectory: input.workingDirectory,
      reasoningEffort: resolveCodexSessionReasoningEffort(
        input.agentRunConfig.llmConfig ?? null,
      ),
      serviceTier: resolveCodexSessionServiceTier(
        input.agentRunConfig.llmConfig ?? null,
      ),
      approvalPolicy: resolveApprovalPolicyForRunConfig(input.agentRunConfig),
      sandbox: resolveEffectiveCodexSandboxModeForRunConfig(input.agentRunConfig),
      baseInstructions: input.baseInstructions,
      developerInstructions: input.developerInstructions,
      appServerConfig: input.appServerConfig,
      dynamicTools: buildCodexDynamicToolSpecs(input.dynamicToolRegistrations),
    });
  }

  private createAgentToolsMcpAppServerConfig(input: {
    runContext: AgentRunContext<CodexAgentRunContext | null>;
    runtimeToolExposure: RuntimeAgentToolExposure;
    workingDirectory: string;
  }): ReturnType<typeof materializeCodexAgentToolsMcpThreadConfig> | null {
    const memberExecutionContext = input.runContext.config.memberExecutionContext;
    const result = this.agentToolMcpRunSessions.activateForRun({
      owner: memberExecutionContext
        ? {
            runId: input.runContext.runId,
            collaborationIdentity: memberExecutionContext.identity,
            displayName: getAgentTeamAddressBasename(memberExecutionContext.identity.memberAddress),
          }
        : { runId: input.runContext.runId },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: input.runContext.runId,
        senderName: (memberExecutionContext ? getAgentTeamAddressBasename(memberExecutionContext.identity.memberAddress) : null) ?? input.runContext.config.agentDefinitionId,
        runtimeKind: input.runContext.config.runtimeKind,
        memberExecutionContext: memberExecutionContext ?? null,
      }),
      runtimeExposure: input.runtimeToolExposure,
      executionContext: {
        workingDirectory: input.workingDirectory,
        memoryDir: input.runContext.config.memoryDir,
        applicationExecutionContext: input.runContext.config.applicationExecutionContext,
      },
      runtimeKind: input.runContext.config.runtimeKind,
    });
    if (result.kind === "not_exposed") {
      return null;
    }
    return materializeCodexAgentToolsMcpThreadConfig(result.descriptor);
  }

}
