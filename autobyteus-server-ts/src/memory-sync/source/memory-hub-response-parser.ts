/**
 * The hub's node access gate refuses a source before the hub's routes run (autobyteus-437); the source shows those
 * refusals in Memory Sync's words.
 */
const HUB_GATE_REFUSAL_TEXT: Readonly<Record<string, string>> = {
  NODE_CREDENTIAL_REQUIRED: "Memory Hub source token is invalid.",
  NODE_CREDENTIAL_INVALID: "Memory Hub source token is invalid.",
  NODE_CREDENTIAL_REVOKED: "Memory Hub source token was revoked.",
  NODE_NETWORK_REFUSED: "The Memory Hub does not accept connections from this node's network.",
};

/** The hub answered a request with an error status. `receivedBytes` is set by a staged-file offset conflict (409). */
export class MemoryHubRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly receivedBytes: number | null,
  ) {
    super(message);
    this.name = "MemoryHubRequestError";
  }
}

export const parseMemoryHubJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let parsed: unknown = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }
  if (!response.ok) {
    const body = (typeof parsed === "object" && parsed ? parsed : {}) as { code?: unknown; message?: unknown; receivedBytes?: unknown };
    const code = body.code === undefined ? "" : String(body.code);
    const receivedBytes = typeof body.receivedBytes === "number" ? body.receivedBytes : null;
    const message = HUB_GATE_REFUSAL_TEXT[code]
      ?? (body.message === undefined ? `Memory Hub request failed with HTTP ${response.status}.` : String(body.message));
    throw new MemoryHubRequestError(message, response.status, code, receivedBytes);
  }
  return parsed as T;
};
