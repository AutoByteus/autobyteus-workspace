import type {
  ScreenshotInput,
  CloseTabInput,
  RunScriptInput,
  ListTabsInput,
  NavigateToInput,
  OpenTabInput,
  DomSnapshotInput,
  BrowserToolName,
  BrowserToolParameterSpec,
  ReadPageInput,
} from "./browser-tool-contract.js";
import {
  SCREENSHOT_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
  LIST_TABS_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  OPEN_TAB_TOOL_NAME,
  DOM_SNAPSHOT_TOOL_NAME,
  BROWSER_READ_PAGE_CLEANING_MODES,
  BROWSER_WAIT_UNTIL_VALUES,
  READ_PAGE_TOOL_NAME,
} from "./browser-tool-contract.js";
import {
  parseScreenshotInput,
  parseCloseTabInput,
  parseRunScriptInput,
  parseListTabsInput,
  parseNavigateToInput,
  parseOpenTabInput,
  parseDomSnapshotInput,
  parseReadPageInput,
} from "./browser-tool-input-parsers.js";
import type { BrowserToolService } from "./browser-tool-service.js";

export type BrowserToolManifestEntry<TInput = unknown, TResult = unknown> = {
  name: BrowserToolName;
  description: string;
  parameters: BrowserToolParameterSpec[];
  parseInput: (rawArguments: Record<string, unknown>) => TInput;
  execute: (service: BrowserToolService, input: TInput) => Promise<TResult>;
};

const buildWaitUntilParameter = (): BrowserToolParameterSpec => ({
  name: "wait_until",
  type: "enum",
  description:
    "Ready state to wait for before returning. Allowed values: domcontentloaded or load.",
  required: false,
  enum_values: BROWSER_WAIT_UNTIL_VALUES,
  default_value: "load",
});

const buildBrowserTabIdParameter = (): BrowserToolParameterSpec => ({
  name: "tab_id",
  type: "string",
  description: "Opaque tab identifier returned by open_tab.",
  required: true,
});

const manifestEntries: BrowserToolManifestEntry[] = [
  {
    name: OPEN_TAB_TOOL_NAME,
    description:
      "Open a frontend tab and return a stable tab_id for follow-up operations.",
    parameters: [
      {
        name: "url",
        type: "string",
        description: "Absolute http, https, or file URL to open in the tab.",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Optional tab title override.",
        required: false,
      },
      {
        name: "reuse_existing",
        type: "boolean",
        description:
          "When true, reuse an existing open tab whose normalized URL matches.",
        required: false,
        default_value: false,
      },
      buildWaitUntilParameter(),
    ],
    parseInput: (rawArguments): OpenTabInput => parseOpenTabInput(rawArguments),
    execute: (service, input) => service.openTab(input as OpenTabInput),
  },
  {
    name: NAVIGATE_TO_TOOL_NAME,
    description:
      "Navigate an existing tab_id to a new URL and wait for the requested ready state.",
    parameters: [
      buildBrowserTabIdParameter(),
      {
        name: "url",
        type: "string",
        description: "Absolute http, https, or file URL to navigate the tab to.",
        required: true,
      },
      buildWaitUntilParameter(),
    ],
    parseInput: (rawArguments): NavigateToInput =>
      parseNavigateToInput(rawArguments),
    execute: (service, input) => service.navigateTo(input as NavigateToInput),
  },
  {
    name: CLOSE_TAB_TOOL_NAME,
    description:
      "Close an existing tab and invalidate its tab_id for future use.",
    parameters: [buildBrowserTabIdParameter()],
    parseInput: (rawArguments): CloseTabInput => parseCloseTabInput(rawArguments),
    execute: (service, input) => service.closeTab(input as CloseTabInput),
  },
  {
    name: LIST_TABS_TOOL_NAME,
    description: "List the currently known tabs and their session metadata.",
    parameters: [],
    parseInput: (): ListTabsInput => parseListTabsInput(),
    execute: (service, input) =>
      service.listTabs(input as ListTabsInput),
  },
  {
    name: READ_PAGE_TOOL_NAME,
    description: "Read and optionally clean HTML from an existing tab.",
    parameters: [
      buildBrowserTabIdParameter(),
      {
        name: "cleaning_mode",
        type: "enum",
        description:
          "Controls how aggressively the returned HTML is cleaned. Allowed values: none, light, or thorough.",
        required: false,
        enum_values: BROWSER_READ_PAGE_CLEANING_MODES,
        default_value: "thorough",
      },
    ],
    parseInput: (rawArguments): ReadPageInput =>
      parseReadPageInput(rawArguments),
    execute: (service, input) => service.readPage(input as ReadPageInput),
  },
  {
    name: SCREENSHOT_TOOL_NAME,
    description:
      "Capture a screenshot from an existing tab and return the artifact path.",
    parameters: [
      buildBrowserTabIdParameter(),
      {
        name: "full_page",
        type: "boolean",
        description: "When true, attempt a full-page screenshot capture.",
        required: false,
        default_value: false,
      },
    ],
    parseInput: (rawArguments): ScreenshotInput =>
      parseScreenshotInput(rawArguments),
    execute: (service, input) =>
      service.takeScreenshot(input as ScreenshotInput),
  },
  {
    name: DOM_SNAPSHOT_TOOL_NAME,
    description: "Capture a structured DOM snapshot for an existing tab.",
    parameters: [
      buildBrowserTabIdParameter(),
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
    parseInput: (rawArguments): DomSnapshotInput =>
      parseDomSnapshotInput(rawArguments),
    execute: (service, input) => service.domSnapshot(input as DomSnapshotInput),
  },
  {
    name: RUN_SCRIPT_TOOL_NAME,
    description:
      "Execute JavaScript inside an existing tab and return the JSON-serialized result.",
    parameters: [
      buildBrowserTabIdParameter(),
      {
        name: "javascript",
        type: "string",
        description: "JavaScript source code to evaluate inside the tab.",
        required: true,
      },
    ],
    parseInput: (rawArguments): RunScriptInput =>
      parseRunScriptInput(rawArguments),
    execute: (service, input) =>
      service.runScript(input as RunScriptInput),
  },
];

const manifestByName = new Map(
  manifestEntries.map((entry) => [entry.name, entry] as const),
);

export const BROWSER_TOOL_MANIFEST = manifestEntries;

export const getBrowserToolManifestEntry = (
  toolName: BrowserToolName,
): BrowserToolManifestEntry => {
  const entry = manifestByName.get(toolName);
  if (!entry) {
    throw new Error(`Unknown browser tool manifest entry: ${toolName}`);
  }
  return entry;
};
