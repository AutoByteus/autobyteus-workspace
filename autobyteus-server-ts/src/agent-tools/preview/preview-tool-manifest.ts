import type {
  CapturePreviewScreenshotInput,
  ClosePreviewInput,
  ExecutePreviewJavascriptInput,
  ListPreviewSessionsInput,
  NavigatePreviewInput,
  OpenPreviewInput,
  PreviewDomSnapshotInput,
  PreviewToolName,
  PreviewToolParameterSpec,
  ReadPreviewPageInput,
} from "./preview-tool-contract.js";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  PREVIEW_READ_PAGE_CLEANING_MODES,
  PREVIEW_WAIT_UNTIL_VALUES,
  READ_PREVIEW_PAGE_TOOL_NAME,
} from "./preview-tool-contract.js";
import {
  parseCapturePreviewScreenshotInput,
  parseClosePreviewInput,
  parseExecutePreviewJavascriptInput,
  parseListPreviewSessionsInput,
  parseNavigatePreviewInput,
  parseOpenPreviewInput,
  parsePreviewDomSnapshotInput,
  parseReadPreviewPageInput,
} from "./preview-tool-input-normalizers.js";
import type { PreviewToolService } from "./preview-tool-service.js";

export type PreviewToolManifestEntry<TInput = unknown, TResult = unknown> = {
  name: PreviewToolName;
  description: string;
  parameters: PreviewToolParameterSpec[];
  parseInput: (rawArguments: Record<string, unknown>) => TInput;
  execute: (service: PreviewToolService, input: TInput) => Promise<TResult>;
};

const buildWaitUntilParameter = (): PreviewToolParameterSpec => ({
  name: "wait_until",
  type: "enum",
  description:
    "Ready state to wait for before returning. Allowed values: domcontentloaded or load.",
  required: false,
  enum_values: PREVIEW_WAIT_UNTIL_VALUES,
  default_value: "load",
});

const buildPreviewSessionIdParameter = (): PreviewToolParameterSpec => ({
  name: "preview_session_id",
  type: "string",
  description: "Opaque preview session identifier returned by open_preview.",
  required: true,
});

const manifestEntries: PreviewToolManifestEntry[] = [
  {
    name: OPEN_PREVIEW_TOOL_NAME,
    description:
      "Open a frontend preview session and return a stable preview_session_id for follow-up operations.",
    parameters: [
      {
        name: "url",
        type: "string",
        description: "Absolute http, https, or file URL to open in the preview session.",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Optional preview session title override.",
        required: false,
      },
      {
        name: "reuse_existing",
        type: "boolean",
        description:
          "When true, reuse an existing open preview session whose normalized URL matches.",
        required: false,
        default_value: false,
      },
      buildWaitUntilParameter(),
    ],
    parseInput: (rawArguments): OpenPreviewInput => parseOpenPreviewInput(rawArguments),
    execute: (service, input) => service.openPreview(input as OpenPreviewInput),
  },
  {
    name: NAVIGATE_PREVIEW_TOOL_NAME,
    description:
      "Navigate an existing preview_session_id to a new URL and wait for the requested ready state.",
    parameters: [
      buildPreviewSessionIdParameter(),
      {
        name: "url",
        type: "string",
        description: "Absolute http, https, or file URL to navigate the preview session to.",
        required: true,
      },
      buildWaitUntilParameter(),
    ],
    parseInput: (rawArguments): NavigatePreviewInput =>
      parseNavigatePreviewInput(rawArguments),
    execute: (service, input) => service.navigatePreview(input as NavigatePreviewInput),
  },
  {
    name: CLOSE_PREVIEW_TOOL_NAME,
    description:
      "Close an existing preview session and invalidate its preview_session_id for future use.",
    parameters: [buildPreviewSessionIdParameter()],
    parseInput: (rawArguments): ClosePreviewInput => parseClosePreviewInput(rawArguments),
    execute: (service, input) => service.closePreview(input as ClosePreviewInput),
  },
  {
    name: LIST_PREVIEW_SESSIONS_TOOL_NAME,
    description: "List the currently known preview sessions and their session metadata.",
    parameters: [],
    parseInput: (): ListPreviewSessionsInput => parseListPreviewSessionsInput(),
    execute: (service, input) =>
      service.listPreviewSessions(input as ListPreviewSessionsInput),
  },
  {
    name: READ_PREVIEW_PAGE_TOOL_NAME,
    description: "Read and optionally clean HTML from an existing preview session.",
    parameters: [
      buildPreviewSessionIdParameter(),
      {
        name: "cleaning_mode",
        type: "enum",
        description:
          "Controls how aggressively the returned HTML is cleaned. Allowed values: none, light, or thorough.",
        required: false,
        enum_values: PREVIEW_READ_PAGE_CLEANING_MODES,
        default_value: "thorough",
      },
    ],
    parseInput: (rawArguments): ReadPreviewPageInput =>
      parseReadPreviewPageInput(rawArguments),
    execute: (service, input) => service.readPreviewPage(input as ReadPreviewPageInput),
  },
  {
    name: CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
    description:
      "Capture a screenshot from an existing preview session and return the artifact path.",
    parameters: [
      buildPreviewSessionIdParameter(),
      {
        name: "full_page",
        type: "boolean",
        description: "When true, attempt a full-page screenshot capture.",
        required: false,
        default_value: false,
      },
    ],
    parseInput: (rawArguments): CapturePreviewScreenshotInput =>
      parseCapturePreviewScreenshotInput(rawArguments),
    execute: (service, input) =>
      service.capturePreviewScreenshot(input as CapturePreviewScreenshotInput),
  },
  {
    name: PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
    description: "Capture a structured DOM snapshot for an existing preview session.",
    parameters: [
      buildPreviewSessionIdParameter(),
      {
        name: "include_non_interactive",
        type: "boolean",
        description: "When true, include visible non-interactive elements.",
        required: false,
        default_value: false,
      },
      {
        name: "include_bounding_boxes",
        type: "boolean",
        description: "When true, include element bounding boxes.",
        required: false,
        default_value: true,
      },
      {
        name: "max_elements",
        type: "integer",
        description: "Maximum number of elements to return. Allowed range: 1 to 2000.",
        required: false,
        default_value: 200,
        minimum: 1,
        maximum: 2000,
      },
    ],
    parseInput: (rawArguments): PreviewDomSnapshotInput =>
      parsePreviewDomSnapshotInput(rawArguments),
    execute: (service, input) => service.previewDomSnapshot(input as PreviewDomSnapshotInput),
  },
  {
    name: EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
    description:
      "Execute JavaScript inside an existing preview session and return the JSON-serialized result.",
    parameters: [
      buildPreviewSessionIdParameter(),
      {
        name: "javascript",
        type: "string",
        description: "JavaScript source code to evaluate inside the preview session.",
        required: true,
      },
    ],
    parseInput: (rawArguments): ExecutePreviewJavascriptInput =>
      parseExecutePreviewJavascriptInput(rawArguments),
    execute: (service, input) =>
      service.executePreviewJavascript(input as ExecutePreviewJavascriptInput),
  },
];

const manifestByName = new Map(
  manifestEntries.map((entry) => [entry.name, entry] as const),
);

export const PREVIEW_TOOL_MANIFEST = manifestEntries;

export const getPreviewToolManifestEntry = (
  toolName: PreviewToolName,
): PreviewToolManifestEntry => {
  const entry = manifestByName.get(toolName);
  if (!entry) {
    throw new Error(`Unknown preview tool manifest entry: ${toolName}`);
  }
  return entry;
};
