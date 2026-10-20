import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GitHubRateLimitError,
  GitHubRateLimitGate,
  setGitHubRateLimitGateForTests,
} from "../../../../src/integrations/github/github-rate-limit-gate.js";
import { publicGitHubRequest } from "../../../../src/integrations/github/public-github-request.js";

const T0 = new Date("2026-10-20T10:00:00.000Z");
const resetEpoch = (date: Date): string => String(Math.floor(date.getTime() / 1000));

describe("GitHubRateLimitGate (REQ-003, QR-001, AR-001)", () => {
  let dir: string;
  let filePath: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "github-gate-"));
    filePath = path.join(dir, "github", "rate-limit.json");
  });
  afterEach(() => {
    setGitHubRateLimitGateForTests(null);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("learns x-ratelimit-reset from a 403 with remaining 0, blocks until then and persists the time", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    const reset = new Date("2026-10-20T10:40:00.000Z");
    const learned = gate.learnFrom(new Response(null, { status: 403, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetEpoch(reset) } }), T0);
    expect(learned?.toISOString()).toBe(reset.toISOString());
    expect(gate.isBlocked(T0)).toBe(true);
    expect(gate.isBlocked(new Date(reset.getTime() + 1))).toBe(false);
    expect(() => gate.assertOpen(T0)).toThrow(GitHubRateLimitError);
    expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual({ blockedUntil: reset.toISOString() });
  });

  it("keeps the stop across a restart: a new gate loads the persisted time", () => {
    const reset = new Date("2026-10-20T10:40:00.000Z");
    new GitHubRateLimitGate(() => filePath).learnFrom(new Response(null, { status: 429, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetEpoch(reset) } }), T0);
    const afterRestart = new GitHubRateLimitGate(() => filePath);
    expect(afterRestart.isBlocked(new Date("2026-10-20T10:20:00.000Z"))).toBe(true);
  });

  it("takes retry-after as sent, and waits 60 s for a 429 without GitHub's headers", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    expect(gate.learnFrom(new Response(null, { status: 403, headers: { "retry-after": "120" } }), T0)?.getTime())
      .toBe(T0.getTime() + 120_000);
    const other = new GitHubRateLimitGate(() => path.join(dir, "other.json"));
    expect(other.learnFrom(new Response(null, { status: 429 }), T0)?.getTime()).toBe(T0.getTime() + 60_000);
  });

  it("does not treat a plain 403 or a success as a rate limit", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    expect(gate.learnFrom(new Response(null, { status: 403 }), T0)).toBeNull();
    expect(gate.learnFrom(new Response(null, { status: 200, headers: { "x-ratelimit-remaining": "0" } }), T0)).toBeNull();
    expect(gate.isBlocked(T0)).toBe(false);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("keeps the later time and never shortens a learned stop", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    gate.learnFrom(new Response(null, { status: 403, headers: { "retry-after": "600" } }), T0);
    gate.learnFrom(new Response(null, { status: 403, headers: { "retry-after": "60" } }), T0);
    expect(gate.isBlocked(new Date(T0.getTime() + 300_000))).toBe(true);
  });

  it("reads a missing, malformed or past file as not blocked", () => {
    expect(new GitHubRateLimitGate(() => filePath).isBlocked(T0)).toBe(false);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "{not json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(new GitHubRateLimitGate(() => filePath).isBlocked(T0)).toBe(false);
    warn.mockRestore();
    fs.writeFileSync(filePath, JSON.stringify({ blockedUntil: "2026-10-20T09:00:00.000Z" }));
    expect(new GitHubRateLimitGate(() => filePath).isBlocked(T0)).toBe(false);
  });

  it("publicGitHubRequest: a limited answer throws, and later api.github.com requests are refused without a request", async () => {
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => filePath));
    const reset = new Date(Date.now() + 3_600_000);
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetEpoch(reset) } }));
    await expect(publicGitHubRequest("https://api.github.com/repos/acme/skills", fetch)).rejects.toThrow(GitHubRateLimitError);
    await expect(publicGitHubRequest("https://api.github.com/repos/acme/other", fetch))
      .rejects.toThrow(/GitHub rate limit reached; try again after \d\d:\d\d/);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("publicGitHubRequest: codeload.github.com archive downloads are not gated", async () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    gate.learnFrom(new Response(null, { status: 403, headers: { "retry-after": "3600" } }));
    setGitHubRateLimitGateForTests(gate);
    const fetch = vi.fn().mockResolvedValue(new Response("archive", { status: 200 }));
    const response = await publicGitHubRequest("https://codeload.github.com/acme/skills/tar.gz/main", fetch);
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
