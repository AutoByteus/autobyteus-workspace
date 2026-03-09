import { appConfigProvider } from "../../config/app-config-provider.js";
import type { ChannelBindingLaunchPreset } from "../domain/models.js";
import type { RuntimeSessionRecord } from "../../runtime-execution/runtime-adapter-port.js";
import type { RunManifest } from "../../run-history/domain/models.js";
import { getRunHistoryService, type RunHistoryService } from "../../run-history/services/run-history-service.js";
import { RunManifestStore } from "../../run-history/store/run-manifest-store.js";

type RunManifestStorePort = Pick<RunManifestStore, "writeManifest">;
type RunHistoryServicePort = Pick<RunHistoryService, "upsertRunHistoryRow">;

export type ChannelRunHistoryBootstrapperDependencies = {
  manifestStore?: RunManifestStorePort;
  runHistoryService?: RunHistoryServicePort;
};

export type BootstrapMessagingRunInput = {
  agentDefinitionId: string;
  launchPreset: ChannelBindingLaunchPreset;
  session: RuntimeSessionRecord;
  initialSummary?: string | null;
};

export class ChannelRunHistoryBootstrapper {
  private readonly manifestStore: RunManifestStorePort;
  private readonly runHistoryService: RunHistoryServicePort;

  constructor(deps: ChannelRunHistoryBootstrapperDependencies = {}) {
    this.manifestStore =
      deps.manifestStore ?? new RunManifestStore(appConfigProvider.config.getMemoryDir());
    this.runHistoryService = deps.runHistoryService ?? getRunHistoryService();
  }

  async bootstrapNewRun(input: BootstrapMessagingRunInput): Promise<void> {
    const runId = normalizeRequiredString(input.session.runId, "session.runId");
    const agentDefinitionId = normalizeRequiredString(
      input.agentDefinitionId,
      "agentDefinitionId",
    );
    const manifest: RunManifest = {
      agentDefinitionId,
      workspaceRootPath: normalizeRequiredString(
        input.launchPreset.workspaceRootPath,
        "launchPreset.workspaceRootPath",
      ),
      llmModelIdentifier: normalizeRequiredString(
        input.launchPreset.llmModelIdentifier,
        "launchPreset.llmModelIdentifier",
      ),
      llmConfig: input.launchPreset.llmConfig ?? null,
      autoExecuteTools: Boolean(input.launchPreset.autoExecuteTools),
      skillAccessMode: input.launchPreset.skillAccessMode ?? null,
      runtimeKind: input.session.runtimeKind,
      runtimeReference: {
        runtimeKind: input.session.runtimeKind,
        sessionId:
          normalizeNullableString(input.session.runtimeReference?.sessionId ?? null) ?? runId,
        threadId: normalizeNullableString(input.session.runtimeReference?.threadId ?? null),
        metadata: input.session.runtimeReference?.metadata ?? null,
      },
    };

    await this.manifestStore.writeManifest(runId, manifest);
    await this.runHistoryService.upsertRunHistoryRow({
      runId,
      manifest,
      summary: compactSummary(input.initialSummary ?? ""),
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });
  }
}

const normalizeRequiredString = (value: string | null | undefined, field: string): string => {
  const normalized = normalizeNullableString(value ?? null);
  if (!normalized) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

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
