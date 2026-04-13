import { tool, BaseTool } from "autobyteus-ts";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ApplicationArtifactRef } from "../domain/models.js";
import { getApplicationSessionService } from "../services/application-session-service.js";

const TOOL_NAME = "publish_application_event";
const TOOL_DESCRIPTION =
  "Publish one typed application event into the owning application session. Supported families: MEMBER_ARTIFACT, DELIVERY_STATE, PROGRESS.";

const buildArgumentSchema = (): ParameterSchema => {
  const schema = new ParameterSchema();
  schema.addParameter(new ParameterDefinition({ name: "contractVersion", type: ParameterType.STRING, description: "Application publication contract version.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "publicationFamily", type: ParameterType.STRING, description: "One of MEMBER_ARTIFACT, DELIVERY_STATE, or PROGRESS.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "publicationKey", type: ParameterType.STRING, description: "Stable family-local upsert key.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "artifactType", type: ParameterType.STRING, description: "Artifact type label for artifact or delivery publications.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "state", type: ParameterType.STRING, description: "Artifact/progress lifecycle state.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "title", type: ParameterType.STRING, description: "Human-facing title for artifact or delivery state.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "summary", type: ParameterType.STRING, description: "Optional summary for artifact or delivery state.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "artifactRef", type: ParameterType.OBJECT, description: "Typed artifact reference payload.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "isFinal", type: ParameterType.BOOLEAN, description: "Whether the member artifact is final.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "deliveryState", type: ParameterType.STRING, description: "Top-level delivery state.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "phaseLabel", type: ParameterType.STRING, description: "Progress phase label.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "percent", type: ParameterType.FLOAT, description: "Optional progress percentage from 0 to 100.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "detailText", type: ParameterType.STRING, description: "Optional progress detail text.", required: false }));
  return schema;
};

const argumentSchema = buildArgumentSchema();

type ToolContext = {
  agentId?: string;
  customData?: Record<string, unknown> | null;
};

const buildPublicationPayload = (input: {
  contractVersion: string;
  publicationFamily: string;
  publicationKey: string;
  artifactType?: string | null;
  state?: string | null;
  title?: string | null;
  summary?: string | null;
  artifactRef?: ApplicationArtifactRef | null;
  isFinal?: boolean | null;
  deliveryState?: string | null;
  phaseLabel?: string | null;
  percent?: number | null;
  detailText?: string | null;
}): Record<string, unknown> => {
  const publication: Record<string, unknown> = {
    contractVersion: input.contractVersion,
    publicationFamily: input.publicationFamily,
    publicationKey: input.publicationKey,
  };

  if (input.artifactType !== undefined) {
    publication["artifactType"] = input.artifactType;
  }
  if (input.state !== undefined) {
    publication["state"] = input.state;
  }
  if (input.title !== undefined) {
    publication["title"] = input.title;
  }
  if (input.summary !== undefined) {
    publication["summary"] = input.summary;
  }
  if (input.artifactRef !== undefined) {
    publication["artifactRef"] = input.artifactRef;
  }
  if (input.isFinal !== undefined) {
    publication["isFinal"] = input.isFinal;
  }
  if (input.deliveryState !== undefined) {
    publication["deliveryState"] = input.deliveryState;
  }
  if (input.phaseLabel !== undefined) {
    publication["phaseLabel"] = input.phaseLabel;
  }
  if (input.percent !== undefined) {
    publication["percent"] = input.percent;
  }
  if (input.detailText !== undefined) {
    publication["detailText"] = input.detailText;
  }

  return publication;
};

export async function publishApplicationEvent(
  context: ToolContext,
  contractVersion: string,
  publicationFamily: string,
  publicationKey: string,
  artifactType?: string | null,
  state?: string | null,
  title?: string | null,
  summary?: string | null,
  artifactRef?: ApplicationArtifactRef | null,
  isFinal?: boolean | null,
  deliveryState?: string | null,
  phaseLabel?: string | null,
  percent?: number | null,
  detailText?: string | null,
): Promise<string> {
  const runId = context.agentId?.trim();
  if (!runId) {
    throw new Error("publish_application_event requires an agent runtime context.");
  }

  const snapshot = await getApplicationSessionService().publishFromRuntime({
    runId,
    customData: context.customData ?? {},
    publication: buildPublicationPayload({
      contractVersion,
      publicationFamily,
      publicationKey,
      artifactType,
      state,
      title,
      summary,
      artifactRef,
      isFinal,
      deliveryState,
      phaseLabel,
      percent,
      detailText,
    }),
  });

  return JSON.stringify({
    success: true,
    applicationSessionId: snapshot.applicationSessionId,
    publicationFamily,
    publicationKey,
  });
}

let cachedTool: BaseTool | null = null;

export function registerPublishApplicationEventTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      argumentSchema,
      category: "Applications",
    })(publishApplicationEvent) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }
  return cachedTool;
}
