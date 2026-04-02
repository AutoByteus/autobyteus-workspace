import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
} from "../../../src/agent-tools/preview/preview-tool-contract.js";

export type RecordedPreviewBridgeRequest = {
  method: string;
  path: string;
  body: Record<string, unknown>;
};

type PreviewBridgeSession = {
  preview_session_id: string;
  url: string;
  title: string | null;
};

const readJsonBody = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
};

const writeJson = (
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
): void => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

export class PreviewBridgeLiveTestServer {
  private server: Server | null = null;
  private readonly authToken = `preview-token-${randomUUID()}`;
  private readonly sessions = new Map<string, PreviewBridgeSession>();
  readonly requests: RecordedPreviewBridgeRequest[] = [];

  async start(): Promise<void> {
    if (this.server) {
      return;
    }

    this.server = createServer(async (request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const providedToken = request.headers["x-autobyteus-preview-token"];
      if (providedToken !== this.authToken) {
        writeJson(response, 401, {
          ok: false,
          error: {
            code: "preview_bridge_unavailable",
            message: "Preview bridge authorization failed.",
          },
        });
        return;
      }

      if (request.method !== "POST") {
        writeJson(response, 404, {
          ok: false,
          error: {
            code: "preview_bridge_unavailable",
            message: `Unexpected preview bridge route '${request.method ?? "UNKNOWN"} ${requestUrl.pathname}'.`,
          },
        });
        return;
      }

      const body = await readJsonBody(request);
      this.requests.push({
        method: request.method,
        path: requestUrl.pathname,
        body,
      });
      switch (requestUrl.pathname) {
        case "/preview/open": {
          const previewSessionId = `preview-session-${this.sessions.size + 1}`;
          const session: PreviewBridgeSession = {
            preview_session_id: previewSessionId,
            url: typeof body.url === "string" ? body.url : "",
            title: typeof body.title === "string" ? body.title : null,
          };
          this.sessions.set(previewSessionId, session);
          writeJson(response, 200, {
            ok: true,
            result: {
              preview_session_id: previewSessionId,
              status: "opened",
              url: session.url,
              title: session.title,
            },
          });
          return;
        }
        case "/preview/navigate": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          session.url = typeof body.url === "string" ? body.url : session.url;
          writeJson(response, 200, {
            ok: true,
            result: {
              preview_session_id: session.preview_session_id,
              status: "navigated",
              url: session.url,
            },
          });
          return;
        }
        case "/preview/list": {
          writeJson(response, 200, {
            ok: true,
            result: {
              sessions: Array.from(this.sessions.values()),
            },
          });
          return;
        }
        case "/preview/read-page": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          writeJson(response, 200, {
            ok: true,
            result: {
              preview_session_id: session.preview_session_id,
              url: session.url,
              cleaning_mode:
                typeof body.cleaning_mode === "string" ? body.cleaning_mode : "thorough",
              content: `<html><body><main>Preview content for ${session.url}</main></body></html>`,
            },
          });
          return;
        }
        case "/preview/screenshot": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          writeJson(response, 200, {
            ok: true,
            result: {
              preview_session_id: session.preview_session_id,
              artifact_path: `/tmp/${session.preview_session_id}.png`,
              mime_type: "image/png",
            },
          });
          return;
        }
        case "/preview/dom-snapshot": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          const includeBoundingBoxes = body.include_bounding_boxes !== false;
          writeJson(response, 200, {
            ok: true,
            result: {
              preview_session_id: session.preview_session_id,
              url: session.url,
              schema_version: "autobyteus-preview-dom-snapshot-v1",
              total_candidates: 1,
              returned_elements: 1,
              truncated: false,
              elements: [
                {
                  element_id: "e1",
                  tag_name: "button",
                  dom_id: null,
                  css_selector: "button:nth-of-type(1)",
                  role: "button",
                  name: "Run",
                  text: "Run",
                  href: null,
                  value: null,
                  bounding_box: includeBoundingBoxes
                    ? { x: 10, y: 20, width: 120, height: 32 }
                    : null,
                },
              ],
            },
          });
          return;
        }
        case "/preview/javascript": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          writeJson(response, 200, {
            ok: true,
            result: {
              preview_session_id: session.preview_session_id,
              result_json: JSON.stringify({
                url: session.url,
                javascript:
                  typeof body.javascript === "string" ? body.javascript : "",
              }),
            },
          });
          return;
        }
        case "/preview/close": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          this.sessions.delete(session.preview_session_id);
          writeJson(response, 200, {
            ok: true,
            result: {
              preview_session_id: session.preview_session_id,
              status: "closed",
            },
          });
          return;
        }
        default: {
          writeJson(response, 404, {
            ok: false,
            error: {
              code: "preview_bridge_unavailable",
              message: `Unexpected preview bridge route '${request.method ?? "UNKNOWN"} ${requestUrl.pathname}'.`,
            },
          });
          return;
        }
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(0, "127.0.0.1", () => resolve());
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    const server = this.server;
    this.server = null;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  getRuntimeEnv(): Record<string, string> {
    if (!this.server) {
      throw new Error("PreviewBridgeLiveTestServer must be started before reading runtime env.");
    }
    const address = this.server.address();
    if (!address || typeof address === "string") {
      throw new Error("PreviewBridgeLiveTestServer did not expose a numeric address.");
    }
    return {
      [PREVIEW_BRIDGE_BASE_URL_ENV]: `http://127.0.0.1:${(address as AddressInfo).port}`,
      [PREVIEW_BRIDGE_TOKEN_ENV]: this.authToken,
    };
  }

  private requireSession(
    body: Record<string, unknown>,
    response: ServerResponse,
  ): PreviewBridgeSession | null {
    const previewSessionId =
      typeof body.preview_session_id === "string" ? body.preview_session_id : null;
    if (!previewSessionId) {
      writeJson(response, 404, {
        ok: false,
        error: {
          code: "preview_session_not_found",
          message: "preview_session_id is required.",
        },
      });
      return null;
    }

    const session = this.sessions.get(previewSessionId);
    if (!session) {
      writeJson(response, 404, {
        ok: false,
        error: {
          code: "preview_session_not_found",
          message: `Preview session '${previewSessionId}' was not found.`,
        },
      });
      return null;
    }

    return session;
  }
}

export const buildOpenPreviewToolPrompt = (input: {
  url: string;
  title: string;
}): string =>
  [
    "You must call the open_preview tool exactly once in this turn.",
    "Do not call any other tool.",
    "Use exactly these arguments:",
    JSON.stringify(
      {
        url: input.url,
        title: input.title,
        wait_until: "load",
      },
      null,
      2,
    ),
    "After the tool call succeeds, reply with DONE only.",
  ].join("\n");

export const buildPreviewToolSurfacePrompt = (input: {
  openUrl: string;
  navigateUrl: string;
  title: string;
}): string =>
  [
    "You must call the preview tools exactly once each in this exact order and do not call any other tool.",
    "The first open_preview call will return preview_session_id 'preview-session-1'. Use that exact preview_session_id for every later preview tool call in this turn.",
    "Call these tools in order with exactly these arguments:",
    `1. open_preview ${JSON.stringify({ url: input.openUrl, title: input.title, wait_until: "load" })}`,
    `2. navigate_preview ${JSON.stringify({ preview_session_id: "preview-session-1", url: input.navigateUrl, wait_until: "load" })}`,
    `3. list_preview_sessions ${JSON.stringify({})}`,
    `4. read_preview_page ${JSON.stringify({ preview_session_id: "preview-session-1", cleaning_mode: "thorough" })}`,
    `5. capture_preview_screenshot ${JSON.stringify({ preview_session_id: "preview-session-1", full_page: false })}`,
    `6. preview_dom_snapshot ${JSON.stringify({ preview_session_id: "preview-session-1", include_non_interactive: false, include_bounding_boxes: true, max_elements: 5 })}`,
    `7. execute_preview_javascript ${JSON.stringify({ preview_session_id: "preview-session-1", javascript: "document.title" })}`,
    `8. close_preview ${JSON.stringify({ preview_session_id: "preview-session-1" })}`,
    "After all eight tool calls succeed, reply with DONE only.",
  ].join("\n");
