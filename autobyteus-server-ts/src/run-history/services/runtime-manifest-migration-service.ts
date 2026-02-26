import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import {
  DEFAULT_RUNTIME_KIND,
  normalizeRuntimeKind,
  type RuntimeKind,
} from "../../runtime-management/runtime-kind.js";
import type { RunManifest, RunRuntimeReference } from "../domain/models.js";
import { canonicalizeWorkspaceRootPath } from "../utils/workspace-path-normalizer.js";

const isSkillAccessMode = (value: unknown): value is SkillAccessMode | null =>
  value === null ||
  value === SkillAccessMode.PRELOADED_ONLY ||
  value === SkillAccessMode.GLOBAL_DISCOVERY ||
  value === SkillAccessMode.NONE;

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export class RuntimeManifestMigrationService {
  migrateAndValidate(runId: string, value: unknown): RunManifest | null {
    const payload = asObject(value);
    if (!payload) {
      return null;
    }

    if (
      typeof payload.agentDefinitionId !== "string" ||
      typeof payload.workspaceRootPath !== "string" ||
      typeof payload.llmModelIdentifier !== "string" ||
      typeof payload.autoExecuteTools !== "boolean" ||
      !isSkillAccessMode(payload.skillAccessMode ?? null)
    ) {
      return null;
    }

    const runtimeKind = this.resolveRuntimeKind(payload.runtimeKind);
    const runtimeReference = this.resolveRuntimeReference(runId, runtimeKind, payload.runtimeReference);
    if (!runtimeReference) {
      return null;
    }

    const llmConfig = asObject(payload.llmConfig);

    return {
      agentDefinitionId: payload.agentDefinitionId.trim(),
      workspaceRootPath: canonicalizeWorkspaceRootPath(payload.workspaceRootPath),
      llmModelIdentifier: payload.llmModelIdentifier.trim(),
      llmConfig,
      autoExecuteTools: Boolean(payload.autoExecuteTools),
      skillAccessMode: (payload.skillAccessMode as SkillAccessMode | null) ?? null,
      runtimeKind,
      runtimeReference,
    };
  }

  private resolveRuntimeKind(value: unknown): RuntimeKind {
    return normalizeRuntimeKind(value, DEFAULT_RUNTIME_KIND);
  }

  private resolveRuntimeReference(
    runId: string,
    runtimeKind: RuntimeKind,
    value: unknown,
  ): RunRuntimeReference | null {
    const payload = asObject(value);
    const referenceRuntimeKind = normalizeRuntimeKind(
      payload?.runtimeKind,
      runtimeKind,
    );
    if (referenceRuntimeKind !== runtimeKind) {
      return null;
    }

    const metadata = asObject(payload?.metadata) ?? null;
    return {
      runtimeKind,
      sessionId:
        typeof payload?.sessionId === "string" && payload.sessionId.trim()
          ? payload.sessionId.trim()
          : runId,
      threadId:
        typeof payload?.threadId === "string" && payload.threadId.trim()
          ? payload.threadId.trim()
          : null,
      metadata,
    };
  }
}

let cachedRuntimeManifestMigrationService: RuntimeManifestMigrationService | null = null;

export const getRuntimeManifestMigrationService = (): RuntimeManifestMigrationService => {
  if (!cachedRuntimeManifestMigrationService) {
    cachedRuntimeManifestMigrationService = new RuntimeManifestMigrationService();
  }
  return cachedRuntimeManifestMigrationService;
};
