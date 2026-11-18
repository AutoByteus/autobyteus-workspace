/**
 * The DeepSeek provider relay end to end inside one process: the real loopback listener and relay routes, a run pass
 * from the real provider relay access, and a fake upstream on `127.0.0.1` standing in for `api.deepseek.com` (the
 * relay definition's origin points at it). Covers the key swap, the body and the SSE reply passed unchanged and
 * streamed, the reports of each call (started, activity, finished with usage before the caller sees the end, the
 * compaction purpose), every refusal before an upstream call in the Anthropic error envelope, revocation, the pass of
 * an integration-only run, and no log line holding the pass or the key. Dummy values only.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { createCredentialProxyHost, type CredentialProxyHost } from "../../../src/credential-proxy/credential-proxy-host.js";
import { createDeepSeekProviderRelay, ProviderRelays } from "../../../src/credential-proxy/provider-relays/provider-relays.js";
import type { ProviderCallObservation } from "../../../src/credential-proxy/provider-relays/provider-call-observation.js";

const KEY = "test-dummy-deepseek-key-5512";
const RUN = { runId: "run-dsh", agentDefinitionId: "agent-a" };
const GITHUB_GRANT = { integrationId: "github", skillName: "github-integration", sourceId: "local:/tmp/integrations" };
const REQUEST_BODY = JSON.stringify({ model: "deepseek-v4-flash", stream: true, dsh_session_log: { id: "s" }, dsh_plugin_packages: [] });

const SSE = [
  'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":321,"cache_read_input_tokens":64,"cache_creation_input_tokens":0,"output_tokens":1}}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
  'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":12}}\n\n',
  'event: message_stop\ndata: {"type":"message_stop"}\n\n',
];

type Seen = { method: string; url: string; apiKey: string | null; authorization: string | null; body: string };

describe("DeepSeek provider relay", () => {
  let upstream: http.Server;
  let upstreamOrigin = "";
  const seen: Seen[] = [];
  let host: CredentialProxyHost;
  let keyStored = true;
  let consoleLines: string[] = [];
  let releaseStream: (() => void) | null = null;

  beforeAll(async () => {
    upstream = http.createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        seen.push({ method: request.method ?? "", url: request.url ?? "", apiKey: (request.headers["x-api-key"] as string) ?? null,
          authorization: request.headers.authorization ?? null, body: Buffer.concat(chunks).toString("utf8") });
        response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        response.write(SSE[0]);
        response.write(SSE[1]);
        // The rest only when the test lets it: the caller must already have the first events (streamed, not buffered).
        releaseStream = () => { response.write(SSE[2]); response.end(SSE[3]); };
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    upstreamOrigin = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  beforeEach(async () => {
    seen.length = 0;
    keyStored = true;
    releaseStream = null;
    host = createCredentialProxyHost({
      relays: new ProviderRelays([createDeepSeekProviderRelay(upstreamOrigin)]),
      // agent-b may use GitHub: its run gets an integration-only pass.
      access: { grantsForAgent: async (id: string) => (id === "agent-b" ? [GITHUB_GRANT] : []), allowsCall: async () => true },
      catalog: { entries: () => [], isSourceRegistered: () => true, describe: () => null,
        sourceRemoving: async () => undefined, sourceChanging: async () => undefined },
      skillSources: null,
      management: () => ({
        getStatusForConsumer: async () => (keyStored ? "CONFIGURED" : "MISSING"),
        resolveForUse: async () => {
          if (!keyStored) throw new SecretVaultError("NOT_FOUND", false, "SECRET_NOT_FOUND");
          return SecretValue.fromString(KEY);
        },
      }) as never,
    });
    await host.listen();
    consoleLines = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { consoleLines.push(args.map(String).join(" ")); });
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await host.close();
  });

  const call = (baseUrl: string, pass: string | null, init: Partial<RequestInit> & { path?: string; headers?: Record<string, string> } = {}) =>
    fetch(`${baseUrl}${init.path ?? "/v1/messages"}`, {
      method: init.method ?? "POST",
      headers: { "content-type": "application/json", ...(pass ? { "x-api-key": pass } : {}), ...init.headers },
      ...(init.method === "GET" ? {} : { body: REQUEST_BODY }),
    });

  const expectRefusal = async (response: Response, status: number, type: string, code: string) => {
    expect(response.status).toBe(status);
    const body = await response.json() as { type: string; error: { type: string; code: string; message: string } };
    expect(body).toMatchObject({ type: "error", error: { type, code } });
    expect(body.error.message.length).toBeGreaterThan(0);
    return body.error.message;
  };

  it("forwards with the vault key, body and stream unchanged, and reports the call to the run's observers (DS-002, DS-003)", async () => {
    const { baseUrl, apiKey } = await host.providerRelayAccess.prepareForRun(RUN, "deepseek");
    const observations: ProviderCallObservation[] = [];
    host.providerRelayAccess.observe(RUN.runId, (observation) => observations.push(observation));

    const response = await call(baseUrl, apiKey, { headers: { "anthropic-version": "2023-06-01" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes("Hello")) received += decoder.decode((await reader.read()).value, { stream: true });
    // Streamed: the caller reads the first events while the upstream still holds the rest.
    expect(observations.map((observation) => observation.kind)).toEqual(["started", "activity"]);
    releaseStream!();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      received += decoder.decode(chunk.value, { stream: true });
    }
    expect(received).toBe(SSE.join(""));

    expect(seen).toEqual([{
      method: "POST", url: "/anthropic/v1/messages", apiKey: KEY, authorization: null, body: REQUEST_BODY,
    }]);
    const finished = observations.at(-1);
    expect(finished).toEqual({
      kind: "finished", callId: observations[0]!.callId, purpose: "turn", httpStatus: 200, stopReason: "end_turn",
      usage: { inputTokens: 321, outputTokens: 12, cacheReadInputTokens: 64, cacheCreationInputTokens: 0 },
    });
    expect(observations[0]).toMatchObject({ kind: "started", purpose: "turn" });
    expect(consoleLines.join("\n")).not.toContain(apiKey);
    expect(consoleLines.join("\n")).not.toContain(KEY);
  });

  it("reports a call marked as compaction with the compaction purpose", async () => {
    const { baseUrl, apiKey } = await host.providerRelayAccess.prepareForRun(RUN, "deepseek");
    const observations: ProviderCallObservation[] = [];
    host.providerRelayAccess.observe(RUN.runId, (observation) => observations.push(observation));
    const responding = call(baseUrl, apiKey, { headers: { "x-deepseek-harness-compact": "1" } });
    await vi.waitFor(() => expect(releaseStream).not.toBeNull());
    releaseStream!();
    await (await responding).text();
    expect(observations[0]).toMatchObject({ kind: "started", purpose: "compaction" });
    expect(observations.at(-1)).toMatchObject({ kind: "finished", purpose: "compaction", httpStatus: 200 });
  });

  it("refuses every call it must not forward before any upstream call, in the Anthropic error envelope (REQ-009, QR-002)", async () => {
    const { baseUrl, apiKey } = await host.providerRelayAccess.prepareForRun(RUN, "deepseek");
    await expectRefusal(await call(baseUrl, null), 401, "authentication_error", "RUN_PASS_INVALID");
    await expectRefusal(await call(baseUrl, "rp_wrong"), 401, "authentication_error", "RUN_PASS_INVALID");
    await expectRefusal(await call(baseUrl, apiKey, { method: "GET" }), 404, "not_found_error", "PATH_NOT_ALLOWED");
    await expectRefusal(await call(baseUrl, apiKey, { path: "/v1/models" }), 404, "not_found_error", "PATH_NOT_ALLOWED");
    await expectRefusal(await call(baseUrl, apiKey, { path: "/../v1/messages" }), 404, "not_found_error", "PATH_NOT_ALLOWED");
    await expectRefusal(await call(baseUrl.replace("/relay/deepseek", "/relay/other"), apiKey), 404, "not_found_error", "PATH_NOT_ALLOWED");

    // An integration-only pass has no relay grant.
    const variables = await host.runAccess.environmentForRun({ runId: "run-integrations", agentDefinitionId: "agent-b" }, {});
    const integrationPass = /\/r\/(rp_[^/]+)\//.exec(variables.AUTOBYTEUS_GITHUB_API_URL ?? "")![1]!;
    await expectRefusal(await call(baseUrl, integrationPass), 403, "permission_error", "RELAY_NOT_ALLOWED");

    keyStored = false;
    expect(await expectRefusal(await call(baseUrl, apiKey), 403, "permission_error", "RELAY_KEY_NOT_SET"))
      .toBe("The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys.");
    expect(seen).toEqual([]);
  });

  it("refuses a revoked pass: the run's pass ends with its relay grant (AC-009, AR-008)", async () => {
    const { baseUrl, apiKey } = await host.providerRelayAccess.prepareForRun(RUN, "deepseek");
    host.runPasses.revokeForRun(RUN.runId);
    await expectRefusal(await call(baseUrl, apiKey), 401, "authentication_error", "RUN_PASS_INVALID");
    expect(seen).toEqual([]);
  });

  it("answers an unreachable upstream with 502 and reports the call finished without usage", async () => {
    const unreachable = createCredentialProxyHost({
      relays: new ProviderRelays([createDeepSeekProviderRelay("http://127.0.0.1:1")]),
      access: { grantsForAgent: async () => [], allowsCall: async () => false },
      catalog: { entries: () => [], isSourceRegistered: () => true, describe: () => null,
        sourceRemoving: async () => undefined, sourceChanging: async () => undefined },
      skillSources: null,
      management: () => ({ getStatusForConsumer: async () => "CONFIGURED", resolveForUse: async () => SecretValue.fromString(KEY) }) as never,
    });
    await unreachable.listen();
    try {
      const { baseUrl, apiKey } = await unreachable.providerRelayAccess.prepareForRun(RUN, "deepseek");
      const observations: ProviderCallObservation[] = [];
      unreachable.providerRelayAccess.observe(RUN.runId, (observation) => observations.push(observation));
      await expectRefusal(await call(baseUrl, apiKey), 502, "api_error", "UPSTREAM_UNREACHABLE");
      expect(observations.at(-1)).toMatchObject({ kind: "finished", httpStatus: 502, usage: null });
    } finally {
      await unreachable.close();
    }
  });
});
