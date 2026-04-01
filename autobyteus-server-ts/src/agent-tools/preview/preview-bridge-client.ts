import {
  CapturePreviewScreenshotInput,
  CapturePreviewScreenshotResult,
  ClosePreviewInput,
  ClosePreviewResult,
  ExecutePreviewJavascriptInput,
  ExecutePreviewJavascriptResult,
  GetPreviewConsoleLogsInput,
  GetPreviewConsoleLogsResult,
  NavigatePreviewInput,
  NavigatePreviewResult,
  OpenPreviewInput,
  OpenPreviewDevToolsInput,
  OpenPreviewDevToolsResult,
  OpenPreviewResult,
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
  PreviewToolError,
  type PreviewErrorCode,
} from "./preview-tool-contract.js";

type PreviewBridgeSuccessResponse<T> = {
  ok: true;
  result: T;
};

type PreviewBridgeErrorResponse = {
  ok: false;
  error?: {
    code?: PreviewErrorCode;
    message?: string;
  };
};

type PreviewBridgeResponse<T> =
  | PreviewBridgeSuccessResponse<T>
  | PreviewBridgeErrorResponse;

const AUTH_HEADER_NAME = "x-autobyteus-preview-token";
const CANONICAL_PREVIEW_ERROR_CODES = new Set<PreviewErrorCode>([
  "preview_unsupported_in_current_environment",
  "preview_session_closed",
  "preview_session_not_found",
  "preview_navigation_failed",
  "preview_javascript_execution_failed",
  "preview_bridge_unavailable",
]);

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class PreviewBridgeClient {
  readonly baseUrl: string;
  readonly authToken: string;

  constructor(input: { baseUrl: string; authToken: string }) {
    this.baseUrl = input.baseUrl.replace(/\/+$/, "");
    this.authToken = input.authToken;
  }

  static fromEnvironment(
    env: NodeJS.ProcessEnv = process.env,
  ): PreviewBridgeClient | null {
    const baseUrl = asTrimmedString(env[PREVIEW_BRIDGE_BASE_URL_ENV]);
    const authToken = asTrimmedString(env[PREVIEW_BRIDGE_TOKEN_ENV]);
    if (!baseUrl || !authToken) {
      return null;
    }
    return new PreviewBridgeClient({ baseUrl, authToken });
  }

  async openPreview(input: OpenPreviewInput): Promise<OpenPreviewResult> {
    return this.post<OpenPreviewResult>("/preview/open", input);
  }

  async navigatePreview(input: NavigatePreviewInput): Promise<NavigatePreviewResult> {
    return this.post<NavigatePreviewResult>("/preview/navigate", input);
  }

  async capturePreviewScreenshot(
    input: CapturePreviewScreenshotInput,
  ): Promise<CapturePreviewScreenshotResult> {
    return this.post<CapturePreviewScreenshotResult>("/preview/screenshot", input);
  }

  async getPreviewConsoleLogs(
    input: GetPreviewConsoleLogsInput,
  ): Promise<GetPreviewConsoleLogsResult> {
    return this.post<GetPreviewConsoleLogsResult>("/preview/console-logs", input);
  }

  async executePreviewJavascript(
    input: ExecutePreviewJavascriptInput,
  ): Promise<ExecutePreviewJavascriptResult> {
    return this.post<ExecutePreviewJavascriptResult>("/preview/javascript", input);
  }

  async openPreviewDevTools(
    input: OpenPreviewDevToolsInput,
  ): Promise<OpenPreviewDevToolsResult> {
    return this.post<OpenPreviewDevToolsResult>("/preview/devtools", input);
  }

  async closePreview(input: ClosePreviewInput): Promise<ClosePreviewResult> {
    return this.post<ClosePreviewResult>("/preview/close", input);
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
      throw new PreviewToolError(
        "preview_bridge_unavailable",
        error instanceof Error ? error.message : String(error),
      );
    }

    let payload: PreviewBridgeResponse<T> | null = null;
    try {
      payload = (await response.json()) as PreviewBridgeResponse<T>;
    } catch (error) {
      throw new PreviewToolError(
        "preview_bridge_unavailable",
        error instanceof Error ? error.message : "Preview bridge returned invalid JSON.",
      );
    }

    if (payload && "ok" in payload && payload.ok === true) {
      return payload.result;
    }

    const errorCode = this.normalizeErrorCode(payload?.error?.code);
    const errorMessage =
      payload?.error?.message ??
      `Preview bridge request failed with HTTP ${response.status}.`;
    throw new PreviewToolError(errorCode, errorMessage);
  }

  private normalizeErrorCode(code: string | undefined): PreviewErrorCode {
    if (code && CANONICAL_PREVIEW_ERROR_CODES.has(code as PreviewErrorCode)) {
      return code as PreviewErrorCode;
    }
    return "preview_bridge_unavailable";
  }
}
