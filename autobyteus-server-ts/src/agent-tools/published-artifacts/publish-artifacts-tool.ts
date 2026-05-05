import { BaseTool } from "autobyteus-ts";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import {
  APPLICATION_EXECUTION_CONTEXT_KEY,
  type ApplicationExecutionContext,
} from "../../application-orchestration/domain/models.js";
import {
  PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
  PUBLISH_ARTIFACTS_TOOL_NAME,
  normalizePublishArtifactsToolInput,
} from "../../services/published-artifacts/published-artifact-tool-contract.js";
import { getPublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";

export type ToolContext = {
  agentId?: string;
  workspaceRootPath?: string | null;
  customData?: Record<string, unknown>;
  config?: {
    memoryDir?: string | null;
  };
  statusManager?: {
    notifier?: {
      notifyAgentArtifactPersisted?: (artifact: Record<string, unknown>) => void | Promise<void>;
    } | null;
  } | null;
};

const normalizeOptionalNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveApplicationExecutionContext = (
  customData: Record<string, unknown> | undefined,
): ApplicationExecutionContext | null => {
  const value = customData?.[APPLICATION_EXECUTION_CONTEXT_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const applicationId = normalizeOptionalNonEmptyString(record.applicationId);
  const bindingId = normalizeOptionalNonEmptyString(record.bindingId);
  const producer = record.producer;
  if (!applicationId || !bindingId || !producer || typeof producer !== "object" || Array.isArray(producer)) {
    return null;
  }

  return {
    applicationId,
    bindingId,
    producer: structuredClone(producer) as ApplicationExecutionContext["producer"],
  };
};

const resolveFallbackRuntimeContext = (context: ToolContext) => {
  const memoryDir = normalizeOptionalNonEmptyString(context.config?.memoryDir);
  const workspaceRootPath = normalizeOptionalNonEmptyString(context.workspaceRootPath);
  const applicationExecutionContext = resolveApplicationExecutionContext(context.customData);
  const notifier = context.statusManager?.notifier ?? null;
  const emitArtifactPersisted =
    typeof notifier?.notifyAgentArtifactPersisted === "function"
      ? (artifact: Record<string, unknown>) =>
          notifier.notifyAgentArtifactPersisted!({
            artifact_id: typeof artifact.id === "string" ? artifact.id : "",
            agent_id:
              typeof artifact.runId === "string" && artifact.runId.trim().length > 0
                ? artifact.runId
                : normalizeOptionalNonEmptyString(context.customData?.member_run_id)
                  ?? normalizeOptionalNonEmptyString(context.agentId)
                  ?? "",
            path: typeof artifact.path === "string" ? artifact.path : "",
            type: typeof artifact.type === "string" ? artifact.type : "",
            revision_id: typeof artifact.revisionId === "string" ? artifact.revisionId : undefined,
            description: typeof artifact.description === "string" ? artifact.description : undefined,
            workspace_root: workspaceRootPath ?? undefined,
          })
      : null;

  if (!memoryDir && !workspaceRootPath && !applicationExecutionContext && !emitArtifactPersisted) {
    return null;
  }

  return {
    memoryDir,
    workspaceRootPath,
    applicationExecutionContext,
    emitArtifactPersisted,
  };
};

const buildArtifactItemSchema = (): ParameterSchema => {
  const itemSchema = new ParameterSchema();
  itemSchema.addParameter(
    new ParameterDefinition({
      name: "path",
      type: ParameterType.STRING,
      description:
        "Absolute path to the file that should be published as an artifact. Prefer the exact absolute path returned by write_file; the file must still be inside the current workspace.",
      required: true,
    }),
  );
  itemSchema.addParameter(
    new ParameterDefinition({
      name: "description",
      type: ParameterType.STRING,
      description: "Optional short description for reviewers and application consumers.",
      required: false,
    }),
  );
  return itemSchema;
};

const buildArgumentSchema = (): ParameterSchema => {
  const schema = new ParameterSchema();
  schema.addParameter(
    new ParameterDefinition({
      name: "artifacts",
      type: ParameterType.ARRAY,
      description:
        "Non-empty list of files to publish. Use a one-item array for a single artifact; each item contains path and optional description.",
      required: true,
      arrayItemSchema: buildArtifactItemSchema(),
    }),
  );
  return schema;
};

const argumentSchema = buildArgumentSchema();

const publishArtifacts = async (context: ToolContext, rawArguments: unknown): Promise<string> => {
  const runId =
    normalizeOptionalNonEmptyString(context.customData?.member_run_id)
    ?? normalizeOptionalNonEmptyString(context.agentId)
    ?? "";
  if (!runId) {
    throw new Error("publish_artifacts requires an agent runtime context.");
  }

  const input = normalizePublishArtifactsToolInput(rawArguments);
  const publicationRequest: Parameters<
    ReturnType<typeof getPublishedArtifactPublicationService>["publishManyForRun"]
  >[0] = {
    runId,
    artifacts: input.artifacts,
  };
  const fallbackRuntimeContext = resolveFallbackRuntimeContext(context);
  if (fallbackRuntimeContext) {
    publicationRequest.fallbackRuntimeContext = fallbackRuntimeContext;
  }

  const artifacts = await getPublishedArtifactPublicationService().publishManyForRun(publicationRequest);

  return JSON.stringify({
    success: true,
    artifacts,
  });
};

class PublishArtifactsTool extends BaseTool<ToolContext, Record<string, unknown>, string> {
  static CATEGORY = "Applications";

  static getName(): string {
    return PUBLISH_ARTIFACTS_TOOL_NAME;
  }

  static getDescription(): string {
    return PUBLISH_ARTIFACTS_TOOL_DESCRIPTION;
  }

  static getArgumentSchema(): ParameterSchema {
    return argumentSchema;
  }

  static getConfigSchema(): null {
    return null;
  }

  protected async _execute(
    context: ToolContext,
    rawArguments: Record<string, unknown> = {},
  ): Promise<string> {
    return publishArtifacts(context, rawArguments);
  }
}

let cachedTool: BaseTool | null = null;

export function registerPublishArtifactsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(PUBLISH_ARTIFACTS_TOOL_NAME)) {
    const definition = new ToolDefinition(
      PUBLISH_ARTIFACTS_TOOL_NAME,
      PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
      ToolOrigin.LOCAL,
      PublishArtifactsTool.CATEGORY,
      () => PublishArtifactsTool.getArgumentSchema(),
      () => PublishArtifactsTool.getConfigSchema(),
      { toolClass: PublishArtifactsTool },
    );
    defaultToolRegistry.registerTool(definition);
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(PUBLISH_ARTIFACTS_TOOL_NAME) as BaseTool;
  }
  return cachedTool;
}
