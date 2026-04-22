import { BaseTool } from "autobyteus-ts";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import {
  PUBLISH_ARTIFACT_TOOL_DESCRIPTION,
  PUBLISH_ARTIFACT_TOOL_NAME,
  normalizePublishArtifactToolInput,
} from "../../services/published-artifacts/published-artifact-tool-contract.js";
import { getPublishedArtifactPublicationService } from "../../services/published-artifacts/published-artifact-publication-service.js";

type ToolContext = {
  agentId?: string;
};

const buildArgumentSchema = (): ParameterSchema => {
  const schema = new ParameterSchema();
  schema.addParameter(
    new ParameterDefinition({
      name: "path",
      type: ParameterType.STRING,
      description: "Workspace-relative path to the file that should be published as an artifact.",
      required: true,
    }),
  );
  schema.addParameter(
    new ParameterDefinition({
      name: "description",
      type: ParameterType.STRING,
      description: "Optional short description for reviewers and application consumers.",
      required: false,
    }),
  );
  return schema;
};

const argumentSchema = buildArgumentSchema();

const publishArtifact = async (context: ToolContext, rawArguments: unknown): Promise<string> => {
  const runId = typeof context.agentId === "string" ? context.agentId.trim() : "";
  if (!runId) {
    throw new Error("publish_artifact requires an agent runtime context.");
  }

  const input = normalizePublishArtifactToolInput(rawArguments);
  const artifact = await getPublishedArtifactPublicationService().publishForRun({
    runId,
    path: input.path,
    description: input.description ?? null,
  });

  return JSON.stringify({
    success: true,
    artifact,
  });
};

class PublishArtifactTool extends BaseTool<ToolContext, Record<string, unknown>, string> {
  static CATEGORY = "Applications";

  static getName(): string {
    return PUBLISH_ARTIFACT_TOOL_NAME;
  }

  static getDescription(): string {
    return PUBLISH_ARTIFACT_TOOL_DESCRIPTION;
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
    return publishArtifact(context, rawArguments);
  }
}

let cachedTool: BaseTool | null = null;

export function registerPublishArtifactTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(PUBLISH_ARTIFACT_TOOL_NAME)) {
    const definition = new ToolDefinition(
      PUBLISH_ARTIFACT_TOOL_NAME,
      PUBLISH_ARTIFACT_TOOL_DESCRIPTION,
      ToolOrigin.LOCAL,
      PublishArtifactTool.CATEGORY,
      () => PublishArtifactTool.getArgumentSchema(),
      () => PublishArtifactTool.getConfigSchema(),
      { toolClass: PublishArtifactTool },
    );
    defaultToolRegistry.registerTool(definition);
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(PUBLISH_ARTIFACT_TOOL_NAME) as BaseTool;
  }
  return cachedTool;
}
