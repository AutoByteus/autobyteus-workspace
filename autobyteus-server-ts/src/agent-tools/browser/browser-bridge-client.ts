import {
  ScreenshotInput,
  ScreenshotResult,
  CloseTabInput,
  CloseTabResult,
  RunScriptInput,
  RunScriptResult,
  ListTabsInput,
  ListTabsResult,
  NavigateToInput,
  NavigateToResult,
  OpenTabInput,
  OpenTabResult,
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
  DomSnapshotInput,
  DomSnapshotResult,
  BrowserToolError,
  ReadPageInput,
  ReadPageResult,
  type BrowserToolErrorCode,
} from "./browser-tool-contract.js";

type BrowserBridgeSuccessResponse<T> = {
  ok: true;
  result: T;
};

type BrowserBridgeErrorResponse = {
  ok: false;
  error?: {
    code?: BrowserToolErrorCode;
    message?: string;
  };
};

type BrowserBridgeResponse<T> =
  | BrowserBridgeSuccessResponse<T>
  | BrowserBridgeErrorResponse;

const AUTH_HEADER_NAME = "x-autobyteus-browser-token";
const CANONICAL_BROWSER_ERROR_CODES = new Set<BrowserToolErrorCode>([
  "browser_unsupported_in_current_environment",
  "browser_tab_closed",
  "browser_tab_not_found",
  "browser_navigation_failed",
  "browser_page_read_failed",
  "dom_snapshot_failed",
  "browser_javascript_execution_failed",
  "browser_bridge_unavailable",
]);

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class BrowserBridgeClient {
  readonly baseUrl: string;
  readonly authToken: string;

  constructor(input: { baseUrl: string; authToken: string }) {
    this.baseUrl = input.baseUrl.replace(/\/+$/, "");
    this.authToken = input.authToken;
  }

  static fromEnvironment(
    env: NodeJS.ProcessEnv = process.env,
  ): BrowserBridgeClient | null {
    const baseUrl = asTrimmedString(env[BROWSER_BRIDGE_BASE_URL_ENV]);
    const authToken = asTrimmedString(env[BROWSER_BRIDGE_TOKEN_ENV]);
    if (!baseUrl || !authToken) {
      return null;
    }
    return new BrowserBridgeClient({ baseUrl, authToken });
  }

  async openTab(input: OpenTabInput): Promise<OpenTabResult> {
    return this.post<OpenTabResult>("/browser/open", input);
  }

  async navigateTo(input: NavigateToInput): Promise<NavigateToResult> {
    return this.post<NavigateToResult>("/browser/navigate", input);
  }

  async takeScreenshot(
    input: ScreenshotInput,
  ): Promise<ScreenshotResult> {
    return this.post<ScreenshotResult>("/browser/screenshot", input);
  }

  async listTabs(
    input: ListTabsInput = {},
  ): Promise<ListTabsResult> {
    return this.post<ListTabsResult>("/browser/list", input);
  }

  async readPage(
    input: ReadPageInput,
  ): Promise<ReadPageResult> {
    return this.post<ReadPageResult>("/browser/read-page", input);
  }

  async runScript(
    input: RunScriptInput,
  ): Promise<RunScriptResult> {
    return this.post<RunScriptResult>("/browser/javascript", input);
  }

  async domSnapshot(
    input: DomSnapshotInput,
  ): Promise<DomSnapshotResult> {
    return this.post<DomSnapshotResult>("/browser/dom-snapshot", input);
  }

  async closeTab(input: CloseTabInput): Promise<CloseTabResult> {
    return this.post<CloseTabResult>("/browser/close", input);
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [AUTH_HEADER_NAME]: this.authToken,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new BrowserToolError(
        "browser_bridge_unavailable",
        error instanceof Error ? error.message : String(error),
      );
    }

    let payload: BrowserBridgeResponse<T> | null = null;
    try {
      payload = (await response.json()) as BrowserBridgeResponse<T>;
    } catch (error) {
      throw new BrowserToolError(
        "browser_bridge_unavailable",
        error instanceof Error ? error.message : "Browser bridge returned invalid JSON.",
      );
    }

    if (payload && "ok" in payload && payload.ok === true) {
      return payload.result;
    }

    const errorCode = this.normalizeErrorCode(payload?.error?.code);
    const errorMessage =
      payload?.error?.message ??
      `Browser bridge request failed with HTTP ${response.status}.`;
    throw new BrowserToolError(errorCode, errorMessage);
  }

  private normalizeErrorCode(code: string | undefined): BrowserToolErrorCode {
    if (code && CANONICAL_BROWSER_ERROR_CODES.has(code as BrowserToolErrorCode)) {
      return code as BrowserToolErrorCode;
    }
    return "browser_bridge_unavailable";
  }
}
