import http from "node:http";

/**
 * Client of the Docker starter's socket (C2, frozen across versions). A server learns where the
 * socket is only from AUTOBYTEUS_STARTER_SOCKET, which the starter puts into its environment; an
 * embedded or development server has none.
 */
export type StarterAnswer = Readonly<{ statusCode: number; body: Record<string, unknown> }>;

export const STARTER_SOCKET_ENV = "AUTOBYTEUS_STARTER_SOCKET";
const STARTER_TIMEOUT_MS = 5_000;

export class StarterClient {
  constructor(private readonly socketPath: string) {}

  /** C2 `GET /status[?target=]`. Rejects when the starter does not answer with JSON in time. */
  getStatus(target?: string): Promise<StarterAnswer> {
    const query = target === undefined ? "" : `?target=${encodeURIComponent(target)}`;
    return this.request("GET", `/status${query}`);
  }

  private request(method: string, path: string): Promise<StarterAnswer> {
    return new Promise((resolve, reject) => {
      const outgoing = http.request({ socketPath: this.socketPath, method, path, timeout: STARTER_TIMEOUT_MS }, (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => { text += chunk; });
        response.on("end", () => {
          try {
            resolve({ statusCode: response.statusCode ?? 0, body: JSON.parse(text) as Record<string, unknown> });
          } catch {
            reject(new Error(`The starter answered ${response.statusCode} without JSON`));
          }
        });
      });
      outgoing.on("timeout", () => outgoing.destroy(new Error(`The starter did not answer within ${STARTER_TIMEOUT_MS / 1000} s`)));
      outgoing.on("error", reject);
      outgoing.end();
    });
  }
}

/** The client for this server's starter, or null when no starter runs this server. */
export function starterClientFromEnvironment(env: NodeJS.ProcessEnv = process.env): StarterClient | null {
  const socketPath = env[STARTER_SOCKET_ENV];
  return socketPath ? new StarterClient(socketPath) : null;
}
