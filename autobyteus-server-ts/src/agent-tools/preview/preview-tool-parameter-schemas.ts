import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  type PreviewToolName,
  type PreviewToolParameterSpec,
  READ_PREVIEW_PAGE_TOOL_NAME,
} from "./preview-tool-contract.js";
import { getPreviewToolManifestEntry } from "./preview-tool-manifest.js";

const toParameterType = (parameter: PreviewToolParameterSpec): ParameterType => {
  switch (parameter.type) {
    case "string":
      return ParameterType.STRING;
    case "boolean":
      return ParameterType.BOOLEAN;
    case "integer":
      return ParameterType.INTEGER;
    case "enum":
      return ParameterType.ENUM;
  }
};

const toParameterDefinition = (
  parameter: PreviewToolParameterSpec,
): ParameterDefinition =>
  new ParameterDefinition({
    name: parameter.name,
    type: toParameterType(parameter),
    description: parameter.description,
    required: parameter.required,
    enumValues: parameter.enum_values ? [...parameter.enum_values] : undefined,
    defaultValue: parameter.default_value,
  });

export const buildPreviewToolParameterSchema = (
  toolName: PreviewToolName,
): ParameterSchema =>
  new ParameterSchema(
    getPreviewToolManifestEntry(toolName).parameters.map(toParameterDefinition),
  );

export const buildOpenPreviewParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(OPEN_PREVIEW_TOOL_NAME);

export const buildNavigatePreviewParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(NAVIGATE_PREVIEW_TOOL_NAME);

export const buildClosePreviewParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(CLOSE_PREVIEW_TOOL_NAME);

export const buildListPreviewSessionsParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(LIST_PREVIEW_SESSIONS_TOOL_NAME);

export const buildReadPreviewPageParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(READ_PREVIEW_PAGE_TOOL_NAME);

export const buildCapturePreviewScreenshotParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME);

export const buildPreviewDomSnapshotParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(PREVIEW_DOM_SNAPSHOT_TOOL_NAME);

export const buildExecutePreviewJavascriptParameterSchema = (): ParameterSchema =>
  buildPreviewToolParameterSchema(EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME);
