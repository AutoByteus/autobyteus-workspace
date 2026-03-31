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

      if (request.method !== "POST" || requestUrl.pathname !== "/preview/open") {
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

      writeJson(response, 200, {
        ok: true,
        result: {
          preview_session_id: `preview-session-${this.requests.length}`,
          status: "opened",
          url: typeof body.url === "string" ? body.url : "",
          title: typeof body.title === "string" ? body.title : null,
        },
      });
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
