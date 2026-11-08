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
    const code = typeof parsed === "object" && parsed && "code" in parsed ? String((parsed as { code?: unknown }).code) : "";
    if (HUB_GATE_REFUSAL_TEXT[code]) throw new Error(HUB_GATE_REFUSAL_TEXT[code]);
    const message = typeof parsed === "object" && parsed && "message" in parsed
      ? String((parsed as { message?: unknown }).message)
      : `Memory Hub request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return parsed as T;
};
