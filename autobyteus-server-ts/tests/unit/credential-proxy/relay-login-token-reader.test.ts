/**
 * autobyteus-581 C10 / DEC-102: the relay node's own Grok login, read from its file (key names as on this
 * Mac, investigation notes) per call and never renewed; an expired one is refused. Dummy values only.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RelayLoginTokenReader } from "../../../src/credential-proxy/provider-relay-peer/relay-login-token-reader.js";

const NOW = Date.parse("2026-11-26T12:00:00.000Z");

let home = "";
beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), "relay-login-")); });
afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

const reader = () => new RelayLoginTokenReader({ grokHome: () => home, now: () => NOW });
const writeAuth = (value: unknown) => fs.writeFileSync(path.join(home, "auth.json"), JSON.stringify(value));

describe("RelayLoginTokenReader", () => {
  it("reads Grok's signed-in issuer key; refuses it after expires_at; leaves the file unchanged", async () => {
    writeAuth({ "https://auth.x.ai::client": { key: "grok-key", refresh_token: "r", expires_at: "2026-11-26T13:00:00Z" } });
    const before = fs.readFileSync(path.join(home, "auth.json"), "utf8");
    expect(await reader().readGrokLogin()).toEqual({ kind: "found", credential: { secret: "grok-key" } });
    expect(fs.readFileSync(path.join(home, "auth.json"), "utf8")).toBe(before);
    writeAuth({ "https://auth.x.ai::client": { key: "grok-key", expires_at: "2026-11-26T11:00:00Z" } });
    expect(await reader().readGrokLogin()).toEqual({ kind: "expired" });
  });
});
