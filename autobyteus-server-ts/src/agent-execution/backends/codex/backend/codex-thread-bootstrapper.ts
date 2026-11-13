import type { JsonObject } from "../codex-app-server-json.js";
import type { IntegrationRunAccess } from "../../../../credential-proxy/integration-run-access.js";
import { buildCodexIntegrationThreadConfig } from "./codex-integration-thread-config.js";
import { buildCodexSandboxWorkspaceWriteConfig } from "./codex-sandbox-workspace-write-config.js";
import { getAgentSemanticMemory, type AgentSemanticMemory } from "../../../../agent-memory/services/agent-semantic-memory.js";
import type { ProviderPreparationGuard } from "../../provider-preparation-guard.js";
import { workspaceCollisionPolicyForScope } from "../../shared/workspace-skill-collision-policy.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../../../../skills/services/skill-service.js";
import {
  getCodexWorkspaceSkillMaterializer,
} from "../codex-workspace-skill-materializer.js";
import type { WorkspaceSkillMaterializer } from "../../shared/workspace-skill-materializer.js";
import { RunWorkspaceSkills } from "../../shared/run-workspace-skills.js";
import { CodexWorkspaceSkillRequestPlanner } from "../codex-workspace-skill-request-planner.js";
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
  getCodexAppServerClientManager,
  type CodexAppServerClientManager,
} from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
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
  private readonly workspaceSkillMaterializer: WorkspaceSkillMaterializer;
  private readonly workspaceResolver: CodexWorkspaceResolver;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly skillService: SkillService;
  private readonly skillRequestPlanner: CodexWorkspaceSkillRequestPlanner;
  private readonly agentToolMcpRunSessions: AgentToolMcpRunSessionActivator;

  constructor(
    agentToolMcpRunSessions: AgentToolMcpRunSessionActivator,
    workspaceSkillMaterializer: WorkspaceSkillMaterializer = getCodexWorkspaceSkillMaterializer(),
    workspaceResolver: CodexWorkspaceResolver = getCodexWorkspaceResolver(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
    private readonly integrationRunAccess: IntegrationRunAccess | null = null,
    private readonly semanticMemory: AgentSemanticMemory = getAgentSemanticMemory(),
  ) {
    if (!agentToolMcpRunSessions) {
      throw new Error("Codex Agent Tools MCP run-session activator is required.");
    }
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.workspaceResolver = workspaceResolver;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
    this.skillRequestPlanner = new CodexWorkspaceSkillRequestPlanner(clientManager);
    this.agentToolMcpRunSessions = agentToolMcpRunSessions;
  }

  /** The run's workspace skill holder, created by the factory when its preparation starts (one per run). */
  createRunWorkspaceSkills(runId: string): RunWorkspaceSkills {
    return new RunWorkspaceSkills({
      runId,
      materializer: this.workspaceSkillMaterializer,
      skillService: this.skillService,
      planRequests: (input) => this.skillRequestPlanner.plan(input),
    });
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
    const semanticMemoryPath = await this.semanticMemory.prepareForRun(agentDefinition);
    const carpenterSystemPrompt = composeSharedCarpenterPrompt({
      agentDefinition,
      memberExecutionContext: runContext.config.memberExecutionContext,
      project: runContext.config.project,
      semanticMemoryPath,
    });
    const dynamicToolRegistrations: CodexDynamicToolRegistration[] | null = null;
    const integrationVariables = (await this.integrationRunAccess?.environmentForRun(
      { runId: runContext.runId, agentDefinitionId: runContext.config.agentDefinitionId }, process.env)) ?? {};
    guard.assertAccepting();
    const codexThreadConfig = this.buildThreadConfig({
      agentRunConfig: runContext.config,
      workingDirectory,
      baseInstructions: carpenterSystemPrompt,
      developerInstructions: null,
      appServerConfig: {
        ...this.createAgentToolsMcpAppServerConfig({ runContext, runtimeToolExposure, workingDirectory }),
        ...buildCodexIntegrationThreadConfig(integrationVariables),
        ...buildCodexSandboxWorkspaceWriteConfig({
          sandbox: resolveEffectiveCodexSandboxModeForRunConfig(runContext.config),
          networkAccess: Object.keys(integrationVariables).length > 0,
          writableRoots: semanticMemoryPath ? [semanticMemoryPath] : [],
        }),
      },
      dynamicToolRegistrations,
    });
    const skillRequests = await this.skillRequestPlanner.plan({
      workingDirectory,
      bindings: configuredSkillBindings,
      assertAccepting: guard.assertAccepting,
      ownClient: guard.ownCodexClient,
    });
    await guard.workspaceSkills.acquire({
      workingDirectory,
      requests: skillRequests,
      workspaceCollisionPolicy: workspaceCollisionPolicyForScope(this.skillService.resolveSkillScope(agentDefinition)),
      assertPreparing: guard.assertAccepting,
    });

    return new AgentRunContext({
      runId: runContext.runId,
      config: runContext.config,
      runtimeContext: new CodexAgentRunContext({
        codexThreadConfig,
        workspaceSkills: guard.workspaceSkills,
        dynamicToolHandlers: buildCodexDynamicToolHandlerMap(
          dynamicToolRegistrations,
        ),
        runtimeToolExposure,
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
    appServerConfig: JsonObject | null;
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
  }): ReturnType<typeof materializeCodexAgentToolsMcpThreadConfig> {
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
    return materializeCodexAgentToolsMcpThreadConfig(result.descriptor);
  }
}
