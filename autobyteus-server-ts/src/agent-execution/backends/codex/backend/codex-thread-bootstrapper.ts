import {
  SkillAccessMode,
  resolveSkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { AgentRunContext } from "../../../domain/agent-run-context.js";
import { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import { SkillService } from "../../../../skills/services/skill-service.js";
import {
  getCodexWorkspaceSkillMaterializer,
  type CodexWorkspaceSkillMaterializer,
  type MaterializedCodexWorkspaceSkill,
} from "../codex-workspace-skill-materializer.js";
import {
  getCodexWorkspaceResolver,
  type CodexWorkspaceResolver,
} from "../codex-workspace-resolver.js";
import { CodexAgentRunContext, type CodexRunContext } from "./codex-agent-run-context.js";
import { resolveCodexSessionReasoningEffort } from "../codex-app-server-model-normalizer.js";
import type { Skill } from "../../../../skills/domain/models.js";
import {
  buildCodexThreadConfig,
  CodexApprovalPolicy,
  type CodexSandboxMode,
  type CodexThreadConfig,
} from "../thread/codex-thread-config.js";
import {
  buildCodexDynamicToolHandlerMap,
  buildCodexDynamicToolSpecs,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import {
  DefaultCodexThreadBootstrapStrategy,
  type CodexThreadBootstrapStrategy,
} from "./codex-thread-bootstrap-strategy.js";
import {
  getTeamMemberCodexThreadBootstrapStrategy,
} from "../team-communication/team-member-codex-thread-bootstrap-strategy.js";
import {
  getCodexAppServerClientManager,
  type CodexAppServerClientManager,
} from "../../../../runtime-management/codex/client/codex-app-server-client-manager.js";
import { buildBrowserDynamicToolRegistrationsForEnabledToolNames } from "../browser/build-browser-dynamic-tool-registrations.js";
import { buildCodexPublishArtifactDynamicToolRegistration } from "../published-artifacts/build-codex-publish-artifact-dynamic-tool-registration.js";
import {
  filterDynamicToolRegistrationsByToolNames,
} from "./codex-configured-tool-gating.js";
import {
  resolveConfiguredAgentToolExposure,
  toConfiguredAgentToolNameSet,
} from "../../../shared/configured-agent-tool-exposure.js";

const DEFAULT_SANDBOX_MODE: CodexSandboxMode = "workspace-write";
const VALID_SANDBOX_MODES = new Set<CodexSandboxMode>([
  "read-only",
  "workspace-write",
  "danger-full-access",
]);

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

export const normalizeSandboxMode = (): CodexSandboxMode => {
  const sandbox = process.env.CODEX_APP_SERVER_SANDBOX?.trim() ?? DEFAULT_SANDBOX_MODE;
  if (VALID_SANDBOX_MODES.has(sandbox as CodexSandboxMode)) {
    return sandbox as CodexSandboxMode;
  }
  logger.warn(
    `Invalid CODEX_APP_SERVER_SANDBOX '${sandbox}', falling back to '${DEFAULT_SANDBOX_MODE}'.`,
  );
  return DEFAULT_SANDBOX_MODE;
};

export const resolveDefaultModel = (): string | null => {
  const model = process.env.CODEX_APP_SERVER_MODEL;
  if (typeof model !== "string") {
    return null;
  }
  const normalized = model.trim();
  return normalized.length > 0 ? normalized : null;
};

export class CodexThreadBootstrapper {
  private readonly workspaceSkillMaterializer: CodexWorkspaceSkillMaterializer;
  private readonly workspaceResolver: CodexWorkspaceResolver;
  private readonly agentDefinitionService: AgentDefinitionService;
  private readonly skillService: SkillService;
  private readonly defaultBootstrapStrategy: CodexThreadBootstrapStrategy;
  private readonly teamBootstrapStrategy: CodexThreadBootstrapStrategy;
  private readonly clientManager: CodexAppServerClientManager;

  constructor(
    workspaceSkillMaterializer: CodexWorkspaceSkillMaterializer = getCodexWorkspaceSkillMaterializer(),
    workspaceResolver: CodexWorkspaceResolver = getCodexWorkspaceResolver(),
    agentDefinitionService: AgentDefinitionService = AgentDefinitionService.getInstance(),
    skillService: SkillService = SkillService.getInstance(),
    defaultBootstrapStrategy: CodexThreadBootstrapStrategy = new DefaultCodexThreadBootstrapStrategy(),
    teamBootstrapStrategy: CodexThreadBootstrapStrategy = getTeamMemberCodexThreadBootstrapStrategy(),
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
  ) {
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
    this.workspaceResolver = workspaceResolver;
    this.agentDefinitionService = agentDefinitionService;
    this.skillService = skillService;
    this.defaultBootstrapStrategy = defaultBootstrapStrategy;
    this.teamBootstrapStrategy = teamBootstrapStrategy;
    this.clientManager = clientManager;
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
    const configuredSkills = await this.skillService.getSkills(
      agentDefinition?.skillNames ?? [],
    );
    const configuredToolExposure = resolveConfiguredAgentToolExposure(agentDefinition);
    const skillAccessMode = resolveSkillAccessMode(
      runContext.config.skillAccessMode ?? null,
      configuredSkills.length,
    );
    const agentInstruction = this.composeBootstrapAgentInstruction(agentDefinition);
    const threadConfigInput = await this.prepareThreadConfigInput(
      runContext,
      agentInstruction,
      configuredToolExposure,
    );
    const publishedArtifactToolRegistrations =
      configuredToolExposure.publishArtifactConfigured
        ? buildCodexPublishArtifactDynamicToolRegistration()
        : null;
    const dynamicToolRegistrations = mergeDynamicToolRegistrations(
      filterDynamicToolRegistrationsByToolNames(
        mergeDynamicToolRegistrations(
          threadConfigInput.dynamicToolRegistrations,
          publishedArtifactToolRegistrations,
        ),
        toConfiguredAgentToolNameSet(configuredToolExposure),
      ),
      buildBrowserDynamicToolRegistrationsForEnabledToolNames(
        configuredToolExposure.enabledBrowserToolNames,
      ),
    );
    const codexThreadConfig = this.buildThreadConfig({
      agentRunConfig: runContext.config,
      workingDirectory,
      baseInstructions: threadConfigInput.baseInstructions,
      developerInstructions: threadConfigInput.developerInstructions,
      dynamicToolRegistrations,
    });
    const materializedConfiguredSkills = await this.prepareWorkspaceSkills({
      workingDirectory,
      configuredSkills: skillAccessMode === SkillAccessMode.NONE ? [] : configuredSkills,
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

  private composeBootstrapAgentInstruction(agentDefinition: {
    instructions?: unknown;
    description?: unknown;
  } | null): string | null {
    const definitionInstructions = asTrimmedString(agentDefinition?.instructions);
    const fallbackInstructions = asTrimmedString(agentDefinition?.description);
    return definitionInstructions ?? fallbackInstructions;
  }

  private buildThreadConfig(input: {
    agentRunConfig: AgentRunConfig;
    workingDirectory: string;
    baseInstructions: string | null;
    developerInstructions: string | null;
    dynamicToolRegistrations: CodexDynamicToolRegistration[] | null;
  }): CodexThreadConfig {
    return buildCodexThreadConfig({
      model: input.agentRunConfig.llmModelIdentifier ?? resolveDefaultModel(),
      workingDirectory: input.workingDirectory,
      reasoningEffort: resolveCodexSessionReasoningEffort(
        input.agentRunConfig.llmConfig ?? null,
      ),
      approvalPolicy: resolveApprovalPolicyForAutoExecuteTools(
        input.agentRunConfig.autoExecuteTools,
      ),
      sandbox: normalizeSandboxMode(),
      baseInstructions: input.baseInstructions,
      developerInstructions: input.developerInstructions,
      dynamicTools: buildCodexDynamicToolSpecs(input.dynamicToolRegistrations),
    });
  }

  private async prepareThreadConfigInput(
    runContext: AgentRunContext<CodexAgentRunContext | null>,
    agentInstruction: string | null,
    configuredToolExposure: import("../../../shared/configured-agent-tool-exposure.js").ConfiguredAgentToolExposure,
  ) {
    const strategy = this.teamBootstrapStrategy.appliesTo(runContext)
      ? this.teamBootstrapStrategy
      : this.defaultBootstrapStrategy;
      return strategy.prepare({
        runContext,
        agentInstruction,
        configuredToolExposure,
      });
  }

  private async prepareWorkspaceSkills(input: {
    workingDirectory: string;
    configuredSkills: Skill[];
    skillAccessMode: SkillAccessMode;
  }): Promise<MaterializedCodexWorkspaceSkill[]> {
    const filteredConfiguredSkills = await this.filterConfiguredSkillsForMaterialization(
      input,
    );
    return this.workspaceSkillMaterializer.materializeConfiguredCodexWorkspaceSkills({
      workingDirectory: input.workingDirectory,
      configuredSkills: filteredConfiguredSkills,
      skillAccessMode: input.skillAccessMode,
    });
  }

  private async filterConfiguredSkillsForMaterialization(input: {
    workingDirectory: string;
    configuredSkills: Skill[];
    skillAccessMode: SkillAccessMode;
  }): Promise<Skill[]> {
    if (
      input.skillAccessMode === SkillAccessMode.NONE ||
      input.configuredSkills.length === 0
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
      if (discoverableSkillNames.size === 0) {
        return input.configuredSkills;
      }
      return input.configuredSkills.filter((skill) => {
        const skillName = asTrimmedString(skill.name);
        return !skillName || !discoverableSkillNames.has(skillName);
      });
    } catch (error) {
      logger.warn(
        `Failed to preflight discoverable Codex skills for '${input.workingDirectory}'; falling back to workspace materialization: ${String(error)}`,
      );
      return input.configuredSkills;
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

const mergeDynamicToolRegistrations = (
  primary: CodexDynamicToolRegistration[] | null,
  secondary: CodexDynamicToolRegistration[] | null,
): CodexDynamicToolRegistration[] | null => {
  const merged = [
    ...(Array.isArray(primary) ? primary : []),
    ...(Array.isArray(secondary) ? secondary : []),
  ];
  return merged.length > 0 ? merged : null;
};

let cachedCodexThreadBootstrapper: CodexThreadBootstrapper | null = null;

export const getCodexThreadBootstrapper = (): CodexThreadBootstrapper => {
  if (!cachedCodexThreadBootstrapper) {
    cachedCodexThreadBootstrapper = new CodexThreadBootstrapper();
  }
  return cachedCodexThreadBootstrapper;
};
