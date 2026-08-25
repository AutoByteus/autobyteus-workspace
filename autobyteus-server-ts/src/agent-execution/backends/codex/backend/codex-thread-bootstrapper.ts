import {
  SkillAccessMode,
  resolveSkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../../../../skills/services/skill-service.js";
import {
  getCodexWorkspaceSkillMaterializer,
} from "../codex-workspace-skill-materializer.js";
import type {
  MaterializedWorkspaceSkill,
  WorkspaceSkillMaterializer,
  WorkspaceSkillReconciliationRequest,
} from "../../shared/workspace-skill-materializer.js";
import {
  getCodexWorkspaceResolver,
  type CodexWorkspaceResolver,
} from "../codex-workspace-resolver.js";
import { CodexAgentRunContext, type CodexRunContext } from "./codex-agent-run-context.js";
import {
  resolveCodexSessionReasoningEffort,
  resolveCodexSessionServiceTier,
} from "../codex-app-server-model-normalizer.js";
import type { ConfiguredAgentSkillBinding } from "../../../../skills/domain/configured-agent-skill-binding.js";
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
import {
  getAgentToolMcpSessionService,
  type AgentToolMcpSessionManager,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import {
  materializeCodexAgentToolsMcpThreadConfig,
} from "../agent-tools-mcp/codex-agent-tools-mcp-materializer.js";
import { composeSharedCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

type DiscoverableSkillLookupClient = {
  request<T = unknown>(
    method: string,
    params: Record<string, unknown> | undefined,
  ): Promise<T>;
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const collectDiscoverableSkillNames = (payload: unknown): Set<string> => {
  const result = new Set<string>();
  const root = asObjectRecord(payload);
  const data = Array.isArray(root?.data) ? root.data : [];
  for (const entryValue of data) {
    const entry = asObjectRecord(entryValue);
    const skills = Array.isArray(entry?.skills) ? entry.skills : [];
    for (const skillValue of skills) {
      const skill = asObjectRecord(skillValue);
      if (skill?.enabled !== true) {
        continue;
      }
      const skillName = asTrimmedString(skill?.name);
      if (skillName) {
        result.add(skillName);
      }
    }
  }
  return result;
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
  private readonly clientManager: CodexAppServerClientManager;
  private readonly agentToolMcpSessionService: AgentToolMcpSessionManager;

  constructor(
    workspaceSkillMaterializer: WorkspaceSkillMaterializer = getCodexWorkspaceSkillMaterializer(),
    workspaceResolver: CodexWorkspaceResolver = getCodexWorkspaceResolver(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
    agentToolMcpSessionService: AgentToolMcpSessionManager = getAgentToolMcpSessionService(),
  ) {
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.workspaceResolver = workspaceResolver;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
    this.clientManager = clientManager;
    this.agentToolMcpSessionService = agentToolMcpSessionService;
  }

  async bootstrapForCreate(
    runContext: AgentRunContext<null>,
  ): Promise<CodexRunContext> {
    return this.bootstrapInternal(runContext, null);
  }

  async bootstrapForRestore(
    runContext: AgentRunContext<CodexAgentRunContext>,
  ): Promise<CodexRunContext> {
    return this.bootstrapInternal(runContext, runContext.runtimeContext);
  }

  private async bootstrapInternal(
    runContext: AgentRunContext<CodexAgentRunContext | null>,
    existingRuntimeContext: CodexAgentRunContext | null,
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
      runContext.config.memberTeamContext,
    );
    const skillAccessMode = resolveSkillAccessMode(
      runContext.config.skillAccessMode ?? null,
      configuredSkillBindings.length,
    );
    const carpenterSystemPrompt = composeSharedCarpenterPrompt({
      agentDefinition,
      memberTeamContext: runContext.config.memberTeamContext,
    });
    const dynamicToolRegistrations: CodexDynamicToolRegistration[] | null = null;
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
    const materializedConfiguredSkills = await this.prepareWorkspaceSkills({
      runId: runContext.runId,
      workingDirectory,
      configuredSkillBindings,
      skillAccessMode,
    });

    return new AgentRunContext({
      runId: runContext.runId,
      config: runContext.config,
      runtimeContext: new CodexAgentRunContext({
        codexThreadConfig,
        materializedConfiguredSkills,
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
    const memberTeamContext = input.runContext.config.memberTeamContext;
    const result = this.agentToolMcpSessionService.createAgentToolMcpSession({
      owner: memberTeamContext
        ? {
            runId: input.runContext.runId,
            teamIdentity: memberTeamContext.identity,
            displayName: getAgentTeamAddressBasename(memberTeamContext.identity.memberAddress),
          }
        : { runId: input.runContext.runId },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: input.runContext.runId,
        senderName: (memberTeamContext ? getAgentTeamAddressBasename(memberTeamContext.identity.memberAddress) : null) ?? input.runContext.config.agentDefinitionId,
        runtimeKind: input.runContext.config.runtimeKind,
        memberTeamContext: memberTeamContext ?? null,
      }),
      runtimeExposure: input.runtimeToolExposure,
      executionContext: {
        workingDirectory: input.workingDirectory,
        memoryDir: input.runContext.config.memoryDir,
        applicationExecutionContext: input.runContext.config.applicationExecutionContext,
      },
      runtimeKind: input.runContext.config.runtimeKind,
    });
    if (result.descriptor.enabledTools.length === 0) {
      return null;
    }
    return materializeCodexAgentToolsMcpThreadConfig(result.descriptor);
  }

  private async prepareWorkspaceSkills(input: {
    runId: string;
    workingDirectory: string;
    configuredSkillBindings: ConfiguredAgentSkillBinding[];
    skillAccessMode: SkillAccessMode;
  }): Promise<MaterializedWorkspaceSkill[]> {
    const requests = await this.planWorkspaceSkillRequests(input);
    return this.workspaceSkillMaterializer.materializeConfiguredWorkspaceSkills({
      runId: input.runId,
      workingDirectory: input.workingDirectory,
      requests,
      skillAccessMode: input.skillAccessMode,
    });
  }

  private async planWorkspaceSkillRequests(input: {
    workingDirectory: string;
    configuredSkillBindings: ConfiguredAgentSkillBinding[];
    skillAccessMode: SkillAccessMode;
  }): Promise<WorkspaceSkillReconciliationRequest[]> {
    if (
      input.skillAccessMode === SkillAccessMode.NONE ||
      input.configuredSkillBindings.length === 0
    ) {
      return [];
    }

    let client: DiscoverableSkillLookupClient | null = null;
    try {
      client = await this.clientManager.acquireClient(input.workingDirectory);
      const response = await client.request<unknown>("skills/list", {
        cwds: [input.workingDirectory],
        forceReload: true,
      });
      const discoverableSkillNames = collectDiscoverableSkillNames(response);
      return input.configuredSkillBindings.map((binding) => {
        if (binding.kind === "unresolved") {
          return { kind: "reconcile-unresolved", name: binding.name };
        }
        const skillName = asTrimmedString(binding.skill.name);
        return skillName && discoverableSkillNames.has(skillName)
          ? { kind: "reconcile-discoverable", skill: binding.skill }
          : { kind: "expose-resolved", skill: binding.skill };
      });
    } catch (error) {
      logger.warn(
        `Failed to preflight discoverable Codex skills for '${input.workingDirectory}'; falling back to workspace materialization: ${String(error)}`,
      );
      return input.configuredSkillBindings.map((binding) =>
        binding.kind === "resolved"
          ? { kind: "expose-resolved", skill: binding.skill }
          : { kind: "reconcile-unresolved", name: binding.name }
      );
    } finally {
      if (client) {
        await this.clientManager.releaseClient(input.workingDirectory).catch((error) => {
          logger.warn(
            `Failed to release Codex skill preflight client for '${input.workingDirectory}': ${String(error)}`,
          );
        });
      }
    }
  }
}

let cachedCodexThreadBootstrapper: CodexThreadBootstrapper | null = null;

export const getCodexThreadBootstrapper = (): CodexThreadBootstrapper => {
  if (!cachedCodexThreadBootstrapper) {
    cachedCodexThreadBootstrapper = new CodexThreadBootstrapper();
  }
  return cachedCodexThreadBootstrapper;
};
