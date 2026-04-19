import { tool, BaseTool } from "autobyteus-ts";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ApplicationArtifactRef } from "@autobyteus/application-sdk-contracts";
import { ApplicationExecutionEventIngressService } from "../services/application-execution-event-ingress-service.js";
import { getApplicationOrchestrationStartupGate } from "../services/application-orchestration-startup-gate.js";

const TOOL_NAME = "publish_artifact";
const TOOL_DESCRIPTION =
  "Publish one application artifact into the owning application execution context. The platform derives application and producer provenance from the runtime context.";

const buildArgumentSchema = (): ParameterSchema => {
  const schema = new ParameterSchema();
  schema.addParameter(new ParameterDefinition({ name: "contractVersion", type: ParameterType.STRING, description: "Application artifact publication contract version.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "artifactKey", type: ParameterType.STRING, description: "Stable artifact upsert key within the current application execution context.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "artifactType", type: ParameterType.STRING, description: "Author-defined artifact type label.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "title", type: ParameterType.STRING, description: "Optional human-facing artifact title.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "summary", type: ParameterType.STRING, description: "Optional artifact summary.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "artifactRef", type: ParameterType.OBJECT, description: "Typed artifact reference payload.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "metadata", type: ParameterType.OBJECT, description: "Optional application-defined artifact metadata object.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "isFinal", type: ParameterType.BOOLEAN, description: "Whether this artifact should be treated as final by the application.", required: false }));
  return schema;
};

const argumentSchema = buildArgumentSchema();

type ToolContext = {
  agentId?: string;
  customData?: Record<string, unknown> | null;
};

const buildPublicationPayload = (input: {
  contractVersion: string;
  artifactKey: string;
  artifactType: string;
  title?: string | null;
  summary?: string | null;
  artifactRef: ApplicationArtifactRef;
  metadata?: Record<string, unknown> | null;
  isFinal?: boolean | null;
}): Record<string, unknown> => {
  const publication: Record<string, unknown> = {
    contractVersion: input.contractVersion,
    artifactKey: input.artifactKey,
    artifactType: input.artifactType,
    artifactRef: input.artifactRef,
  };
  if (input.title !== undefined) {
    publication["title"] = input.title;
  }
  if (input.summary !== undefined) {
    publication["summary"] = input.summary;
  }
  if (input.metadata !== undefined) {
    publication["metadata"] = input.metadata;
  }
  if (input.isFinal !== undefined) {
    publication["isFinal"] = input.isFinal;
  }
  return publication;
};

export async function publishArtifact(
  context: ToolContext,
  contractVersion: string,
  artifactKey: string,
  artifactType: string,
  title: string | null | undefined,
  summary: string | null | undefined,
  artifactRef: ApplicationArtifactRef,
  metadata?: Record<string, unknown> | null,
  isFinal?: boolean | null,
): Promise<string> {
  const runId = context.agentId?.trim();
  if (!runId) {
    throw new Error("publish_artifact requires an agent runtime context.");
  }

  await getApplicationOrchestrationStartupGate().awaitReady();
  const binding = await new ApplicationExecutionEventIngressService().appendRuntimeArtifactEvent({
    runId,
    customData: context.customData ?? {},
    publication: buildPublicationPayload({
      contractVersion,
      artifactKey,
      artifactType,
      title,
      summary,
      artifactRef,
      metadata,
      isFinal,
    }),
  });

  return JSON.stringify({
    success: true,
    bindingId: binding.bindingId,
    bindingIntentId: binding.bindingIntentId,
    artifactKey,
  });
}

let cachedTool: BaseTool | null = null;

export function registerPublishArtifactTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      argumentSchema,
      category: "Applications",
    })(publishArtifact) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }
  return cachedTool;
}
