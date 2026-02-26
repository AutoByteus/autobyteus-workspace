import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { UserInputConverter } from "../../api/graphql/converters/user-input-converter.js";
import { AgentUserInput } from "../../api/graphql/types/agent-user-input.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { RunManifest, RunRuntimeOverrides } from "../domain/models.js";
import { RunHistoryIndexStore } from "../store/run-history-index-store.js";
import { RunManifestStore } from "../store/run-manifest-store.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import { getRunHistoryService } from "./run-history-service.js";

type AgentLike = {
  postUserMessage: (message: AgentInputUserMessage) => Promise<void>;
};

export interface ContinueRunInput {
  userInput: AgentUserInput;
  runId?: string | null;
  agentDefinitionId?: string | null;
  workspaceRootPath?: string | null;
  workspaceId?: string | null;
  llmModelIdentifier?: string | null;
  autoExecuteTools?: boolean | null;
  llmConfig?: Record<string, unknown> | null;
  skillAccessMode?: SkillAccessMode | null;
}

export interface ContinueRunResult {
  runId: string;
  ignoredConfigFields: string[];
}

const compactSummary = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 100) {
    return normalized;
  }
  return `${normalized.slice(0, 97)}...`;
};

export class RunContinuationService {
  private agentRunManager: AgentRunManager;
  private workspaceManager = getWorkspaceManager();
  private manifestStore: RunManifestStore;
  private indexStore: RunHistoryIndexStore;
  private runHistoryService = getRunHistoryService();

  constructor(memoryDir: string) {
    this.agentRunManager = AgentRunManager.getInstance();
    this.manifestStore = new RunManifestStore(memoryDir);
    this.indexStore = new RunHistoryIndexStore(memoryDir);
  }

  async continueRun(input: ContinueRunInput): Promise<ContinueRunResult> {
    if (!input.userInput?.content?.trim()) {
      throw new Error("userInput.content is required.");
    }

    if (input.runId?.trim()) {
      return this.continueExistingRun(input.runId.trim(), input);
    }
    return this.createAndContinueNewRun(input);
  }

  private async continueExistingRun(
    runId: string,
    input: ContinueRunInput,
  ): Promise<ContinueRunResult> {
    const overrides = this.toRuntimeOverrides(input);
    const activeAgent = this.agentRunManager.getAgentRun(runId) as AgentLike | null;
    const ignoredConfigFields: string[] = [];

    if (activeAgent) {
      ignoredConfigFields.push(...this.detectIgnoredActiveOverrides(overrides));
      await activeAgent.postUserMessage(UserInputConverter.toAgentInputUserMessage(input.userInput));
      await this.indexStore.updateRow(runId, {
        lastKnownStatus: "ACTIVE",
        lastActivityAt: new Date().toISOString(),
      });
      return { runId, ignoredConfigFields };
    }

    const manifest = await this.manifestStore.readManifest(runId);
    if (!manifest) {
      throw new Error(`Run '${runId}' cannot be continued because manifest is missing.`);
    }

    const effectiveConfig = this.mergeInactiveOverrides(manifest, overrides);
    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(
      effectiveConfig.workspaceRootPath,
    );
    await this.agentRunManager.restoreAgentRun({
      runId: runId,
      agentDefinitionId: effectiveConfig.agentDefinitionId,
      llmModelIdentifier: effectiveConfig.llmModelIdentifier,
      autoExecuteTools: effectiveConfig.autoExecuteTools,
      workspaceId: workspace.workspaceId,
      llmConfig: effectiveConfig.llmConfig,
      skillAccessMode: effectiveConfig.skillAccessMode,
    });

    const restored = this.agentRunManager.getAgentRun(runId) as AgentLike | null;
    if (!restored) {
      throw new Error(`Run '${runId}' restore failed.`);
    }

    await this.manifestStore.writeManifest(runId, effectiveConfig);
    await restored.postUserMessage(UserInputConverter.toAgentInputUserMessage(input.userInput));
    await this.runHistoryService.upsertRunHistoryRow({
      runId,
      manifest: effectiveConfig,
      summary: compactSummary(input.userInput.content),
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });
    return { runId, ignoredConfigFields };
  }

  private async createAndContinueNewRun(input: ContinueRunInput): Promise<ContinueRunResult> {
    if (!input.agentDefinitionId?.trim()) {
      throw new Error("agentDefinitionId is required when creating a new run.");
    }
    if (!input.llmModelIdentifier?.trim()) {
      throw new Error("llmModelIdentifier is required when creating a new run.");
    }

    let workspaceId = input.workspaceId?.trim() || null;
    let workspaceRootPath = input.workspaceRootPath?.trim() || null;
    if (workspaceRootPath) {
      workspaceRootPath = canonicalizeWorkspaceRootPath(workspaceRootPath);
      const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(workspaceRootPath);
      workspaceId = workspace.workspaceId;
    }

    const runId = await this.agentRunManager.createAgentRun({
      agentDefinitionId: input.agentDefinitionId.trim(),
      llmModelIdentifier: input.llmModelIdentifier.trim(),
      autoExecuteTools: input.autoExecuteTools ?? false,
      workspaceId,
      llmConfig: input.llmConfig ?? null,
      skillAccessMode: input.skillAccessMode ?? null,
    });

    const agent = this.agentRunManager.getAgentRun(runId) as AgentLike | null;
    if (!agent) {
      throw new Error(`Newly created run '${runId}' was not found.`);
    }

    const resolvedWorkspaceRootPath = this.resolveWorkspaceRootPath({
      workspaceRootPath,
      workspaceId,
    });
    const manifest: RunManifest = {
      agentDefinitionId: input.agentDefinitionId.trim(),
      workspaceRootPath: resolvedWorkspaceRootPath,
      llmModelIdentifier: input.llmModelIdentifier.trim(),
      llmConfig: input.llmConfig ?? null,
      autoExecuteTools: input.autoExecuteTools ?? false,
      skillAccessMode: input.skillAccessMode ?? null,
    };

    await this.manifestStore.writeManifest(runId, manifest);
    await this.runHistoryService.upsertRunHistoryRow({
      runId,
      manifest,
      summary: compactSummary(input.userInput.content),
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });

    await agent.postUserMessage(UserInputConverter.toAgentInputUserMessage(input.userInput));
    return { runId, ignoredConfigFields: [] };
  }

  private toRuntimeOverrides(input: ContinueRunInput): RunRuntimeOverrides {
    return {
      llmModelIdentifier: input.llmModelIdentifier,
      llmConfig: input.llmConfig,
      autoExecuteTools: input.autoExecuteTools,
      skillAccessMode: input.skillAccessMode,
      workspaceRootPath: input.workspaceRootPath,
    };
  }

  private detectIgnoredActiveOverrides(overrides: RunRuntimeOverrides): string[] {
    const ignored: string[] = [];
    if (overrides.llmModelIdentifier !== undefined && overrides.llmModelIdentifier !== null) {
      ignored.push("llmModelIdentifier");
    }
    if (overrides.llmConfig !== undefined && overrides.llmConfig !== null) {
      ignored.push("llmConfig");
    }
    if (overrides.autoExecuteTools !== undefined && overrides.autoExecuteTools !== null) {
      ignored.push("autoExecuteTools");
    }
    if (overrides.skillAccessMode !== undefined && overrides.skillAccessMode !== null) {
      ignored.push("skillAccessMode");
    }
    if (overrides.workspaceRootPath !== undefined && overrides.workspaceRootPath !== null) {
      ignored.push("workspaceRootPath");
    }
    return ignored;
  }

  private mergeInactiveOverrides(
    manifest: RunManifest,
    overrides: RunRuntimeOverrides,
  ): RunManifest {
    if (
      overrides.workspaceRootPath &&
      canonicalizeWorkspaceRootPath(overrides.workspaceRootPath) !==
        canonicalizeWorkspaceRootPath(manifest.workspaceRootPath)
    ) {
      throw new Error("Workspace cannot be changed for an existing run.");
    }
    return {
      agentDefinitionId: manifest.agentDefinitionId,
      workspaceRootPath: manifest.workspaceRootPath,
      llmModelIdentifier:
        overrides.llmModelIdentifier?.trim() || manifest.llmModelIdentifier,
      llmConfig: overrides.llmConfig ?? manifest.llmConfig ?? null,
      autoExecuteTools:
        typeof overrides.autoExecuteTools === "boolean"
          ? overrides.autoExecuteTools
          : manifest.autoExecuteTools,
      skillAccessMode:
        overrides.skillAccessMode !== undefined
          ? overrides.skillAccessMode
          : manifest.skillAccessMode,
    };
  }

  private resolveWorkspaceRootPath(options: {
    workspaceRootPath: string | null;
    workspaceId: string | null;
  }): string {
    if (options.workspaceRootPath) {
      return canonicalizeWorkspaceRootPath(options.workspaceRootPath);
    }
    if (options.workspaceId) {
      const workspace = this.workspaceManager.getWorkspaceById(options.workspaceId);
      const basePath = workspace?.getBasePath();
      if (basePath) {
        return canonicalizeWorkspaceRootPath(basePath);
      }
    }
    return canonicalizeWorkspaceRootPath(appConfigProvider.config.getTempWorkspaceDir());
  }
}

let cachedRunContinuationService: RunContinuationService | null = null;

export const getRunContinuationService = (): RunContinuationService => {
  if (!cachedRunContinuationService) {
    cachedRunContinuationService = new RunContinuationService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedRunContinuationService;
};
