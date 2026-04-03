import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts";
import {
  SCREENSHOT_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
  LIST_TABS_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  OPEN_TAB_TOOL_NAME,
  DOM_SNAPSHOT_TOOL_NAME,
  type BrowserToolName,
  type BrowserToolParameterSpec,
  READ_PAGE_TOOL_NAME,
} from "./browser-tool-contract.js";
import { getBrowserToolManifestEntry } from "./browser-tool-manifest.js";

const toParameterType = (parameter: BrowserToolParameterSpec): ParameterType => {
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
  parameter: BrowserToolParameterSpec,
): ParameterDefinition =>
  new ParameterDefinition({
    name: parameter.name,
    type: toParameterType(parameter),
    description: parameter.description,
    required: parameter.required,
    enumValues: parameter.enum_values ? [...parameter.enum_values] : undefined,
    defaultValue: parameter.default_value,
  });

export const buildBrowserToolParameterSchema = (
  toolName: BrowserToolName,
): ParameterSchema =>
  new ParameterSchema(
    getBrowserToolManifestEntry(toolName).parameters.map(toParameterDefinition),
  );

export const buildOpenTabParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(OPEN_TAB_TOOL_NAME);

export const buildNavigateToParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(NAVIGATE_TO_TOOL_NAME);

export const buildCloseTabParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(CLOSE_TAB_TOOL_NAME);

export const buildListTabsParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(LIST_TABS_TOOL_NAME);

export const buildReadPageParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(READ_PAGE_TOOL_NAME);

export const buildScreenshotParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(SCREENSHOT_TOOL_NAME);

export const buildDomSnapshotParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(DOM_SNAPSHOT_TOOL_NAME);

export const buildRunScriptParameterSchema = (): ParameterSchema =>
  buildBrowserToolParameterSchema(RUN_SCRIPT_TOOL_NAME);
