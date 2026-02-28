import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { UserInputConverter } from "../../api/graphql/converters/user-input-converter.js";
import { AgentUserInput } from "../../api/graphql/types/agent-user-input.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  getRuntimeCommandIngressService,
  RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import {
  getRuntimeCompositionService,
  RuntimeCompositionService,
} from "../../runtime-execution/runtime-composition-service.js";
import { getExternalRuntimeEventSourceRegistry } from "../../runtime-execution/external-runtime-event-source-registry.js";
import {
  normalizeRuntimeKind,
  type RuntimeKind,
} from "../../runtime-management/runtime-kind.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  RunManifest,
  RunRuntimeOverrides,
  type RunRuntimeReference,
} from "../domain/models.js";
import { RunHistoryIndexStore } from "../store/run-history-index-store.js";
import { RunManifestStore } from "../store/run-manifest-store.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";
import {
  ActiveRunOverridePolicy,
  getActiveRunOverridePolicy,
} from "./active-run-override-policy.js";
import { getRunHistoryService } from "./run-history-service.js";

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
  runtimeKind?: string | null;
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

const buildCommandFailureError = (code: string | undefined, message: string | undefined): Error =>
  new Error(`Runtime command rejected${code ? ` [${code}]` : ""}: ${message ?? "unknown error"}.`);

const toRunRuntimeReference = (
  runId: string,
  runtimeKind: RuntimeKind,
  reference:
    | RunRuntimeReference
    | {
        runtimeKind: RuntimeKind;
        sessionId?: string | null;
        threadId?: string | null;
        metadata?: Record<string, unknown> | null;
      }
    | null,
): RunRuntimeReference => ({
  runtimeKind,
  sessionId:
    reference && typeof reference.sessionId === "string" && reference.sessionId.trim()
      ? reference.sessionId.trim()
      : runId,
  threadId:
    reference && typeof reference.threadId === "string" && reference.threadId.trim()
      ? reference.threadId.trim()
      : null,
  metadata: reference?.metadata ?? null,
});

type AgentLike = {
  postUserMessage: (message: AgentInputUserMessage) => Promise<void>;
};

export class RunContinuationService {
  private runtimeCompositionService: RuntimeCompositionService;
  private runtimeCommandIngressService: RuntimeCommandIngressService;
  private activeRunOverridePolicy: ActiveRunOverridePolicy;
  private agentRunManager: AgentRunManager;
  private workspaceManager = getWorkspaceManager();
  private manifestStore: RunManifestStore;
  private indexStore: RunHistoryIndexStore;
  private runHistoryService = getRunHistoryService();
  private externalRuntimeEventSourceRegistry = getExternalRuntimeEventSourceRegistry();

  constructor(memoryDir: string) {
    this.runtimeCompositionService = getRuntimeCompositionService();
    this.runtimeCommandIngressService = getRuntimeCommandIngressService();
    this.activeRunOverridePolicy = getActiveRunOverridePolicy();
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
    const ignoredConfigFields: string[] = [];
    const activeSession = this.runtimeCompositionService.getRunSession(runId);
    const normalizedSession =
      activeSession &&
      activeSession.runtimeKind !== "autobyteus" &&
      !this.externalRuntimeEventSourceRegistry.hasActiveRunSession(activeSession.runtimeKind, runId)
        ? null
        : activeSession;
    if (!normalizedSession && activeSession) {
      this.runtimeCompositionService.removeRunSession(runId);
    }
    const activeAgent = this.agentRunManager.getAgentRun(runId) as AgentLike | null;

    if (normalizedSession || activeAgent) {
      ignoredConfigFields.push(...this.activeRunOverridePolicy.resolveIgnoredConfigFields(overrides));
      const sendResult = await this.runtimeCommandIngressService.sendTurn({
        runId,
        mode: "agent",
        message: UserInputConverter.toAgentInputUserMessage(input.userInput),
      });
      if (!sendResult.accepted) {
        throw buildCommandFailureError(sendResult.code, sendResult.message);
      }
      if (normalizedSession && sendResult.runtimeReference) {
        this.runtimeCommandIngressService.bindRunSession({
          ...normalizedSession,
          runtimeReference: sendResult.runtimeReference,
        });
      }
      await this.persistRuntimeReferenceForRun(
        runId,
        normalizedSession?.runtimeKind,
        sendResult.runtimeReference,
      );
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

    const restoredSession = await this.runtimeCompositionService.restoreAgentRun({
      runId,
      runtimeKind: effectiveConfig.runtimeKind,
      runtimeReference: effectiveConfig.runtimeReference,
      agentDefinitionId: effectiveConfig.agentDefinitionId,
      llmModelIdentifier: effectiveConfig.llmModelIdentifier,
      autoExecuteTools: effectiveConfig.autoExecuteTools,
      workspaceId: workspace.workspaceId,
      llmConfig: effectiveConfig.llmConfig,
      skillAccessMode: effectiveConfig.skillAccessMode,
    });
    this.runtimeCommandIngressService.bindRunSession(restoredSession);

    let persistedManifest: RunManifest = {
      ...effectiveConfig,
      runtimeKind: restoredSession.runtimeKind,
      runtimeReference: toRunRuntimeReference(
        restoredSession.runId,
        restoredSession.runtimeKind,
        restoredSession.runtimeReference ?? effectiveConfig.runtimeReference,
      ),
    };

    await this.manifestStore.writeManifest(runId, persistedManifest);

    const sendResult = await this.runtimeCommandIngressService.sendTurn({
      runId,
      mode: "agent",
      message: UserInputConverter.toAgentInputUserMessage(input.userInput),
    });
    if (!sendResult.accepted) {
      throw buildCommandFailureError(sendResult.code, sendResult.message);
    }
    if (sendResult.runtimeReference) {
      persistedManifest = {
        ...persistedManifest,
        runtimeReference: toRunRuntimeReference(
          runId,
          restoredSession.runtimeKind,
          sendResult.runtimeReference,
        ),
      };
      await this.manifestStore.writeManifest(runId, persistedManifest);
      this.runtimeCommandIngressService.bindRunSession({
        ...restoredSession,
        runtimeReference: sendResult.runtimeReference,
      });
    }

    await this.runHistoryService.upsertRunHistoryRow({
      runId,
      manifest: persistedManifest,
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

    const runtimeKind = normalizeRuntimeKind(input.runtimeKind);
    const createdSession = await this.runtimeCompositionService.createAgentRun({
      runtimeKind,
      agentDefinitionId: input.agentDefinitionId.trim(),
      llmModelIdentifier: input.llmModelIdentifier.trim(),
      autoExecuteTools: input.autoExecuteTools ?? false,
      workspaceId,
      llmConfig: input.llmConfig ?? null,
      skillAccessMode: input.skillAccessMode ?? null,
    });
    this.runtimeCommandIngressService.bindRunSession(createdSession);

    const resolvedWorkspaceRootPath = this.resolveWorkspaceRootPath({
      workspaceRootPath,
      workspaceId,
    });

    const runId = createdSession.runId;
    let manifest: RunManifest = {
      agentDefinitionId: input.agentDefinitionId.trim(),
      workspaceRootPath: resolvedWorkspaceRootPath,
      llmModelIdentifier: input.llmModelIdentifier.trim(),
      llmConfig: input.llmConfig ?? null,
      autoExecuteTools: input.autoExecuteTools ?? false,
      skillAccessMode: input.skillAccessMode ?? null,
      runtimeKind: createdSession.runtimeKind,
      runtimeReference: toRunRuntimeReference(
        createdSession.runId,
        createdSession.runtimeKind,
        createdSession.runtimeReference,
      ),
    };

    await this.manifestStore.writeManifest(runId, manifest);
    await this.runHistoryService.upsertRunHistoryRow({
      runId,
      manifest,
      summary: compactSummary(input.userInput.content),
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });

    const sendResult = await this.runtimeCommandIngressService.sendTurn({
      runId,
      mode: "agent",
      message: UserInputConverter.toAgentInputUserMessage(input.userInput),
    });
    if (!sendResult.accepted) {
      throw buildCommandFailureError(sendResult.code, sendResult.message);
    }
    if (sendResult.runtimeReference) {
      manifest = {
        ...manifest,
        runtimeReference: toRunRuntimeReference(
          runId,
          createdSession.runtimeKind,
          sendResult.runtimeReference,
        ),
      };
      await this.manifestStore.writeManifest(runId, manifest);
      this.runtimeCommandIngressService.bindRunSession({
        ...createdSession,
        runtimeReference: sendResult.runtimeReference,
      });
    }

    return { runId, ignoredConfigFields: [] };
  }

  private toRuntimeOverrides(input: ContinueRunInput): RunRuntimeOverrides {
    return {
      llmModelIdentifier: input.llmModelIdentifier,
      llmConfig: input.llmConfig,
      autoExecuteTools: input.autoExecuteTools,
      skillAccessMode: input.skillAccessMode,
      workspaceRootPath: input.workspaceRootPath,
      runtimeKind: input.runtimeKind ? normalizeRuntimeKind(input.runtimeKind) : undefined,
    };
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

    const runtimeKind = overrides.runtimeKind ?? manifest.runtimeKind;
    if (runtimeKind !== manifest.runtimeKind) {
      throw new Error("Runtime kind cannot be changed for an existing run.");
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
      runtimeKind: manifest.runtimeKind,
      runtimeReference: {
        ...manifest.runtimeReference,
      },
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

  private async persistRuntimeReferenceForRun(
    runId: string,
    runtimeKind: RuntimeKind | undefined,
    runtimeReference:
      | RunRuntimeReference
      | {
          runtimeKind: RuntimeKind;
          sessionId?: string | null;
          threadId?: string | null;
          metadata?: Record<string, unknown> | null;
        }
      | null
      | undefined,
  ): Promise<void> {
    if (!runtimeReference) {
      return;
    }
    const manifest = await this.manifestStore.readManifest(runId);
    if (!manifest) {
      return;
    }
    const effectiveRuntimeKind = runtimeKind ?? manifest.runtimeKind;
    if (effectiveRuntimeKind !== manifest.runtimeKind) {
      return;
    }
    const nextReference = toRunRuntimeReference(runId, effectiveRuntimeKind, runtimeReference);
    const unchanged =
      manifest.runtimeReference.sessionId === nextReference.sessionId &&
      manifest.runtimeReference.threadId === nextReference.threadId &&
      JSON.stringify(manifest.runtimeReference.metadata ?? null) ===
        JSON.stringify(nextReference.metadata ?? null);
    if (unchanged) {
      return;
    }
    await this.manifestStore.writeManifest(runId, {
      ...manifest,
      runtimeReference: nextReference,
    });
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
