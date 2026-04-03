import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
} from "../../../src/agent-tools/browser/browser-tool-contract.js";

export type RecordedBrowserBridgeRequest = {
  method: string;
  path: string;
  body: Record<string, unknown>;
};

type BrowserBridgeSession = {
  tab_id: string;
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

export class BrowserBridgeLiveTestServer {
  private server: Server | null = null;
  private readonly authToken = `browser-token-${randomUUID()}`;
  private readonly sessions = new Map<string, BrowserBridgeSession>();
  readonly requests: RecordedBrowserBridgeRequest[] = [];

  async start(): Promise<void> {
    if (this.server) {
      return;
    }

    this.server = createServer(async (request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const providedToken = request.headers["x-autobyteus-browser-token"];
      if (providedToken !== this.authToken) {
        writeJson(response, 401, {
          ok: false,
          error: {
            code: "browser_bridge_unavailable",
            message: "Browser bridge authorization failed.",
          },
        });
        return;
      }

      if (request.method !== "POST") {
        writeJson(response, 404, {
          ok: false,
          error: {
            code: "browser_bridge_unavailable",
            message: `Unexpected browser bridge route '${request.method ?? "UNKNOWN"} ${requestUrl.pathname}'.`,
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
        case "/browser/open": {
          const browserSessionId = `browser-session-${this.sessions.size + 1}`;
          const session: BrowserBridgeSession = {
            tab_id: browserSessionId,
            url: typeof body.url === "string" ? body.url : "",
            title: typeof body.title === "string" ? body.title : null,
          };
          this.sessions.set(browserSessionId, session);
          writeJson(response, 200, {
            ok: true,
            result: {
              tab_id: browserSessionId,
              status: "opened",
              url: session.url,
              title: session.title,
            },
          });
          return;
        }
        case "/browser/navigate": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          session.url = typeof body.url === "string" ? body.url : session.url;
          writeJson(response, 200, {
            ok: true,
            result: {
              tab_id: session.tab_id,
              status: "navigated",
              url: session.url,
            },
          });
          return;
        }
        case "/browser/list": {
          writeJson(response, 200, {
            ok: true,
            result: {
              sessions: Array.from(this.sessions.values()),
            },
          });
          return;
        }
        case "/browser/read-page": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          writeJson(response, 200, {
            ok: true,
            result: {
              tab_id: session.tab_id,
              url: session.url,
              cleaning_mode:
                typeof body.cleaning_mode === "string" ? body.cleaning_mode : "thorough",
              content: `<html><body><main>Browser content for ${session.url}</main></body></html>`,
            },
          });
          return;
        }
        case "/browser/screenshot": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          writeJson(response, 200, {
            ok: true,
            result: {
              tab_id: session.tab_id,
              artifact_path: `/tmp/${session.tab_id}.png`,
              mime_type: "image/png",
            },
          });
          return;
        }
        case "/browser/dom-snapshot": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          const includeBoundingBoxes = body.include_bounding_boxes !== false;
          writeJson(response, 200, {
            ok: true,
            result: {
              tab_id: session.tab_id,
              url: session.url,
              schema_version: "autobyteus-browser-dom-snapshot-v1",
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
        case "/browser/javascript": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          writeJson(response, 200, {
            ok: true,
            result: {
              tab_id: session.tab_id,
              result_json: JSON.stringify({
                url: session.url,
                javascript:
                  typeof body.javascript === "string" ? body.javascript : "",
              }),
            },
          });
          return;
        }
        case "/browser/close": {
          const session = this.requireSession(body, response);
          if (!session) {
            return;
          }
          this.sessions.delete(session.tab_id);
          writeJson(response, 200, {
            ok: true,
            result: {
              tab_id: session.tab_id,
              status: "closed",
            },
          });
          return;
        }
        default: {
          writeJson(response, 404, {
            ok: false,
            error: {
              code: "browser_bridge_unavailable",
              message: `Unexpected browser bridge route '${request.method ?? "UNKNOWN"} ${requestUrl.pathname}'.`,
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
      throw new Error("BrowserBridgeLiveTestServer must be started before reading runtime env.");
    }
    const address = this.server.address();
    if (!address || typeof address === "string") {
      throw new Error("BrowserBridgeLiveTestServer did not expose a numeric address.");
    }
    return {
      [BROWSER_BRIDGE_BASE_URL_ENV]: `http://127.0.0.1:${(address as AddressInfo).port}`,
      [BROWSER_BRIDGE_TOKEN_ENV]: this.authToken,
    };
  }

  private requireSession(
    body: Record<string, unknown>,
    response: ServerResponse,
  ): BrowserBridgeSession | null {
    const browserSessionId =
      typeof body.tab_id === "string" ? body.tab_id : null;
    if (!browserSessionId) {
      writeJson(response, 404, {
        ok: false,
        error: {
          code: "browser_tab_not_found",
          message: "tab_id is required.",
        },
      });
      return null;
    }

    const session = this.sessions.get(browserSessionId);
    if (!session) {
      writeJson(response, 404, {
        ok: false,
        error: {
          code: "browser_tab_not_found",
          message: `Browser session '${browserSessionId}' was not found.`,
        },
      });
      return null;
    }

    return session;
  }
}

export const buildOpenBrowserToolPrompt = (input: {
  url: string;
  title: string;
}): string =>
  [
    "You must call the open_tab tool exactly once in this turn.",
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

export const buildBrowserToolSurfacePrompt = (input: {
  openUrl: string;
  navigateUrl: string;
  title: string;
}): string =>
  [
    "You must call the browser tools exactly once each in this exact order and do not call any other tool.",
    "The first open_tab call will return tab_id 'browser-session-1'. Use that exact tab_id for every later browser tool call in this turn.",
    "Call these tools in order with exactly these arguments:",
    `1. open_tab ${JSON.stringify({ url: input.openUrl, title: input.title, wait_until: "load" })}`,
    `2. navigate_to ${JSON.stringify({ tab_id: "browser-session-1", url: input.navigateUrl, wait_until: "load" })}`,
    `3. list_tabs ${JSON.stringify({})}`,
    `4. read_page ${JSON.stringify({ tab_id: "browser-session-1", cleaning_mode: "thorough" })}`,
    `5. screenshot ${JSON.stringify({ tab_id: "browser-session-1", full_page: false })}`,
    `6. dom_snapshot ${JSON.stringify({ tab_id: "browser-session-1", include_non_interactive: false, include_bounding_boxes: true, max_elements: 5 })}`,
    `7. run_script ${JSON.stringify({ tab_id: "browser-session-1", javascript: "document.title" })}`,
    `8. close_tab ${JSON.stringify({ tab_id: "browser-session-1" })}`,
    "After all eight tool calls succeed, reply with DONE only.",
  ].join("\n");
