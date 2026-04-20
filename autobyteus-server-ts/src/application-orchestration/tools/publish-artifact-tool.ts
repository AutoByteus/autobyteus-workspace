import { tool, BaseTool } from "autobyteus-ts";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts/utils/parameter-schema.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ApplicationArtifactRef } from "@autobyteus/application-sdk-contracts";
import { ApplicationExecutionEventIngressService } from "../services/application-execution-event-ingress-service.js";
import { getApplicationOrchestrationStartupGate } from "../services/application-orchestration-startup-gate.js";

const TOOL_NAME = "publish_artifact";
const TOOL_DESCRIPTION =
  "Publish one application artifact into the owning application execution context. The platform derives application and producer provenance from the runtime context. For app-authored text or structured payloads, prefer artifactRef = { kind: 'INLINE_JSON', mimeType: 'application/json', value: { body: '...' } }.";

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const buildArtifactRefSchema = (): ParameterSchema => {
  const schema = new ParameterSchema();
  schema.addParameter(new ParameterDefinition({
    name: "kind",
    type: ParameterType.ENUM,
    description: "Canonical artifactRef kind. For Brief Studio and Socratic artifacts, use INLINE_JSON.",
    required: false,
    enumValues: ["WORKSPACE_FILE", "URL", "BUNDLE_ASSET", "INLINE_JSON"],
  }));
  schema.addParameter(new ParameterDefinition({
    name: "mimeType",
    type: ParameterType.STRING,
    description: "For INLINE_JSON artifactRefs, usually application/json.",
    required: false,
  }));
  schema.addParameter(new ParameterDefinition({
    name: "value",
    type: ParameterType.OBJECT,
    description: "Canonical INLINE_JSON payload. Prefer { body: '...' } for brief/research text.",
    required: false,
  }));
  schema.addParameter(new ParameterDefinition({
    name: "url",
    type: ParameterType.STRING,
    description: "URL artifact target when kind is URL.",
    required: false,
  }));
  schema.addParameter(new ParameterDefinition({
    name: "assetPath",
    type: ParameterType.STRING,
    description: "Bundle asset path when kind is BUNDLE_ASSET.",
    required: false,
  }));
  schema.addParameter(new ParameterDefinition({
    name: "path",
    type: ParameterType.STRING,
    description: "Workspace-relative file path when kind is WORKSPACE_FILE.",
    required: false,
  }));
  schema.addParameter(new ParameterDefinition({
    name: "workspaceId",
    type: ParameterType.STRING,
    description: "Optional workspace id when kind is WORKSPACE_FILE.",
    required: false,
  }));
  return schema;
};

const normalizeInlineJsonValue = (value: unknown): unknown => (
  typeof value === "string" ? { body: value } : structuredClone(value)
);

const normalizeToolArtifactRef = (artifactRef: unknown): ApplicationArtifactRef => {
  if (artifactRef === null || artifactRef === undefined) {
    throw new Error("artifactRef is required.");
  }

  if (typeof artifactRef !== "object" || artifactRef instanceof Date) {
    return {
      kind: "INLINE_JSON",
      mimeType: "application/json",
      value: normalizeInlineJsonValue(artifactRef),
    };
  }

  if (Array.isArray(artifactRef)) {
    return {
      kind: "INLINE_JSON",
      mimeType: "application/json",
      value: structuredClone(artifactRef),
    };
  }

  const record = artifactRef as Record<string, unknown>;
  const explicitKind = typeof record.kind === "string" && record.kind.trim()
    ? record.kind.trim().toUpperCase()
    : typeof record.type === "string" && record.type.trim()
      ? record.type.trim().toUpperCase()
      : "";

  if (explicitKind === "WORKSPACE_FILE") {
    return {
      kind: "WORKSPACE_FILE",
      workspaceId: typeof record.workspaceId === "string" ? record.workspaceId : null,
      path: typeof record.path === "string" ? record.path : "",
    };
  }

  if (explicitKind === "URL") {
    return {
      kind: "URL",
      url: typeof record.url === "string" ? record.url : "",
    };
  }

  if (explicitKind === "BUNDLE_ASSET") {
    return {
      kind: "BUNDLE_ASSET",
      assetPath: typeof record.assetPath === "string" ? record.assetPath : "",
    };
  }

  if (explicitKind === "INLINE_JSON") {
    return {
      kind: "INLINE_JSON",
      mimeType: typeof record.mimeType === "string" && record.mimeType.trim()
        ? record.mimeType.trim()
        : "application/json",
      value: hasOwn(record, "value")
        ? normalizeInlineJsonValue(record.value)
        : hasOwn(record, "data")
          ? normalizeInlineJsonValue(record.data)
          : normalizeInlineJsonValue(Object.fromEntries(
            Object.entries(record).filter(([key]) => key !== "kind" && key !== "type" && key !== "mimeType"),
          )),
    };
  }

  if (hasOwn(record, "mimeType") && hasOwn(record, "value")) {
    return {
      kind: "INLINE_JSON",
      mimeType: typeof record.mimeType === "string" && record.mimeType.trim()
        ? record.mimeType.trim()
        : "application/json",
      value: normalizeInlineJsonValue(record.value),
    };
  }

  if (hasOwn(record, "data")) {
    return {
      kind: "INLINE_JSON",
      mimeType: typeof record.mimeType === "string" && record.mimeType.trim()
        ? record.mimeType.trim()
        : "application/json",
      value: normalizeInlineJsonValue(record.data),
    };
  }

  return {
    kind: "INLINE_JSON",
    mimeType: "application/json",
    value: normalizeInlineJsonValue(record),
  };
};

const buildArgumentSchema = (): ParameterSchema => {
  const schema = new ParameterSchema();
  schema.addParameter(new ParameterDefinition({ name: "contractVersion", type: ParameterType.STRING, description: "Application artifact publication contract version.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "artifactKey", type: ParameterType.STRING, description: "Stable artifact upsert key within the current application execution context.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "artifactType", type: ParameterType.STRING, description: "Author-defined artifact type label.", required: true }));
  schema.addParameter(new ParameterDefinition({ name: "title", type: ParameterType.STRING, description: "Optional human-facing artifact title.", required: false }));
  schema.addParameter(new ParameterDefinition({ name: "summary", type: ParameterType.STRING, description: "Optional artifact summary.", required: false }));
  schema.addParameter(new ParameterDefinition({
    name: "artifactRef",
    type: ParameterType.OBJECT,
    description: "Typed artifact reference payload. Preferred inline JSON example: { kind: 'INLINE_JSON', mimeType: 'application/json', value: { body: 'Draft body here' } }.",
    required: true,
    objectSchema: buildArtifactRefSchema(),
  }));
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
  artifactRef: unknown,
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
      artifactRef: normalizeToolArtifactRef(artifactRef),
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
