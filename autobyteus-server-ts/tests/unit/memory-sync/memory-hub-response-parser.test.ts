import { describe, expect, it } from "vitest";
import { parseMemoryHubJsonResponse } from "../../../src/memory-sync/source/memory-hub-response-parser.js";

const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("parseMemoryHubJsonResponse", () => {
  it("NAS-26 shows the hub gate's refusal of the source's credential in Memory Sync's words", async () => {
    await expect(parseMemoryHubJsonResponse(answer(401, { code: "NODE_CREDENTIAL_INVALID", message: "This node does not accept this credential." })))
      .rejects.toThrow("Memory Hub source token is invalid.");
    await expect(parseMemoryHubJsonResponse(answer(401, { code: "NODE_CREDENTIAL_REQUIRED", message: "x" })))
      .rejects.toThrow("Memory Hub source token is invalid.");
    await expect(parseMemoryHubJsonResponse(answer(403, { code: "NODE_CREDENTIAL_REVOKED", message: "x" })))
      .rejects.toThrow("Memory Hub source token was revoked.");
    await expect(parseMemoryHubJsonResponse(answer(403, { code: "NODE_NETWORK_REFUSED", message: "x" })))
      .rejects.toThrow("The Memory Hub does not accept connections from this node's network.");
  });

  it("keeps the hub's own message for its other refusals, and returns an accepted answer", async () => {
    await expect(parseMemoryHubJsonResponse(answer(503, { error: "MEMORY_SYNC_NOT_MIGRATED", code: "MEMORY_SYNC_NOT_MIGRATED", message: "Memory Sync is waiting for its data migration." })))
      .rejects.toThrow("Memory Sync is waiting for its data migration.");
    await expect(parseMemoryHubJsonResponse(answer(200, { ok: true }))).resolves.toEqual({ ok: true });
  });
});
