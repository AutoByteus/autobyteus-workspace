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

describe("GitHubRateLimitGate (REQ-004, AR-003)", () => {
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

  it("api: learns x-ratelimit-reset from a 403 with remaining 0, blocks only the api family and persists { api, web }", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    const reset = new Date("2026-10-20T10:40:00.000Z");
    const learned = gate.learnFrom("api", new Response(null, { status: 403, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetEpoch(reset) } }), T0);
    expect(learned?.toISOString()).toBe(reset.toISOString());
    expect(gate.isBlocked("api", T0)).toBe(true);
    expect(gate.isBlocked("web", T0)).toBe(false);
    expect(gate.blockedUntil("api", T0)?.toISOString()).toBe(reset.toISOString());
    expect(gate.isBlocked("api", new Date(reset.getTime() + 1))).toBe(false);
    expect(() => gate.assertOpen("api", T0)).toThrow(GitHubRateLimitError);
    expect(() => gate.assertOpen("web", T0)).not.toThrow();
    expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual({ api: reset.toISOString(), web: null });
  });

  it("api: takes retry-after as sent, waits 60 s for a bare 429, and ignores a plain 403 or a success", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    expect(gate.learnFrom("api", new Response(null, { status: 403, headers: { "retry-after": "120" } }), T0)?.getTime())
      .toBe(T0.getTime() + 120_000);
    const other = new GitHubRateLimitGate(() => path.join(dir, "other.json"));
    expect(other.learnFrom("api", new Response(null, { status: 429 }), T0)?.getTime()).toBe(T0.getTime() + 60_000);
    const fresh = new GitHubRateLimitGate(() => path.join(dir, "fresh.json"));
    expect(fresh.learnFrom("api", new Response(null, { status: 403 }), T0)).toBeNull();
    expect(fresh.learnFrom("api", new Response(null, { status: 200, headers: { "x-ratelimit-remaining": "0" } }), T0)).toBeNull();
    expect(fs.existsSync(path.join(dir, "fresh.json"))).toBe(false);
  });

  it("web: learns from 429 and 503 (retry-after, else 60 s), never from a 403 or the REST headers", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    expect(gate.learnFrom("web", new Response(null, { status: 403, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetEpoch(new Date(T0.getTime() + 3_600_000)) } }), T0)).toBeNull();
    expect(gate.learnFrom("web", new Response(null, { status: 503 }), T0)?.getTime()).toBe(T0.getTime() + 60_000);
    expect(gate.learnFrom("web", new Response(null, { status: 429, headers: { "retry-after": "300" } }), T0)?.getTime())
      .toBe(T0.getTime() + 300_000);
    expect(gate.isBlocked("web", new Date(T0.getTime() + 200_000))).toBe(true);
    expect(gate.isBlocked("api", T0)).toBe(false);
  });

  it("keeps each family's stop across a restart", () => {
    const reset = new Date("2026-10-20T10:40:00.000Z");
    const gate = new GitHubRateLimitGate(() => filePath);
    gate.learnFrom("api", new Response(null, { status: 429, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetEpoch(reset) } }), T0);
    gate.learnFrom("web", new Response(null, { status: 429, headers: { "retry-after": "60" } }), T0);
    const afterRestart = new GitHubRateLimitGate(() => filePath);
    expect(afterRestart.isBlocked("api", new Date("2026-10-20T10:20:00.000Z"))).toBe(true);
    expect(afterRestart.isBlocked("web", new Date(T0.getTime() + 30_000))).toBe(true);
    expect(afterRestart.isBlocked("web", new Date(T0.getTime() + 61_000))).toBe(false);
  });

  it("keeps the later time and never shortens a learned stop", () => {
    const gate = new GitHubRateLimitGate(() => filePath);
    gate.learnFrom("web", new Response(null, { status: 429, headers: { "retry-after": "600" } }), T0);
    gate.learnFrom("web", new Response(null, { status: 429, headers: { "retry-after": "60" } }), T0);
    expect(gate.isBlocked("web", new Date(T0.getTime() + 300_000))).toBe(true);
  });

  it("reads a missing, malformed, past or old-shaped ({ blockedUntil }) file as not blocked", () => {
    expect(new GitHubRateLimitGate(() => filePath).isBlocked("api", T0)).toBe(false);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "{not json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(new GitHubRateLimitGate(() => filePath).isBlocked("api", T0)).toBe(false);
    warn.mockRestore();
    fs.writeFileSync(filePath, JSON.stringify({ api: "2026-10-20T09:00:00.000Z", web: "nonsense" }));
    const past = new GitHubRateLimitGate(() => filePath);
    expect(past.isBlocked("api", T0)).toBe(false);
    expect(past.isBlocked("web", T0)).toBe(false);
    fs.writeFileSync(filePath, JSON.stringify({ blockedUntil: "2026-10-20T11:00:00.000Z" }));
    const old = new GitHubRateLimitGate(() => filePath);
    expect(old.isBlocked("api", T0)).toBe(false);
    expect(old.isBlocked("web", T0)).toBe(false);
  });
});

describe("publicGitHubRequest per gate family", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "github-request-"));
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => path.join(dir, "rate-limit.json")));
  });
  afterEach(() => {
    setGitHubRateLimitGateForTests(null);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("a limited api answer throws, later api requests are refused without a request, web requests still go", async () => {
    const reset = new Date(Date.now() + 3_600_000);
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 403, headers: {
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetEpoch(reset) } }));
    await expect(publicGitHubRequest("https://api.github.com/repos/acme/skills", { fetchImpl })).rejects.toThrow(GitHubRateLimitError);
    await expect(publicGitHubRequest("https://api.github.com/repos/acme/other", { fetchImpl }))
      .rejects.toThrow(/GitHub rate limit reached; try again after \d\d:\d\d/);
    expect(fetchImpl).toHaveBeenCalledOnce();
    fetchImpl.mockResolvedValue(new Response("archive", { status: 200 }));
    expect((await publicGitHubRequest("https://codeload.github.com/acme/skills/tar.gz/main", { fetchImpl })).status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("a throttled git service answer stops the web family (git service and codeload), not the REST API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 429, headers: { "retry-after": "600" } }));
    await expect(publicGitHubRequest("https://github.com/acme/skills.git/git-upload-pack", { method: "POST", fetchImpl }))
      .rejects.toThrow(GitHubRateLimitError);
    await expect(publicGitHubRequest("https://codeload.github.com/acme/skills/tar.gz/main", { fetchImpl }))
      .rejects.toThrow(GitHubRateLimitError);
    expect(fetchImpl).toHaveBeenCalledOnce();
    fetchImpl.mockResolvedValue(new Response("{}", { status: 200 }));
    expect((await publicGitHubRequest("https://api.github.com/repos/acme/skills", { fetchImpl })).status).toBe(200);
  });

  it("allows github.com only for a repository's git service and latest-release redirect", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response("ok", { status: 200 }));
    for (const url of [
      "https://github.com/acme/skills",
      "https://github.com/acme/skills/archive/main.tar.gz",
      "https://github.com/acme/skills/git-upload-pack",
      "https://github.com/acme/skills/releases/tag/v1",
      "https://github.com/login",
    ]) {
      await expect(publicGitHubRequest(url, { fetchImpl })).rejects.toThrow("Unsupported");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    await publicGitHubRequest("https://github.com/acme/skills.git/git-upload-pack", { method: "POST", body: "0000", fetchImpl });
    await publicGitHubRequest("https://github.com/openai/codex/releases/latest", { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: "POST", body: "0000", redirect: "manual" });
  });

  it("followRedirects false returns the redirect answer itself", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: {
      location: "https://github.com/openai/codex/releases/tag/rust-v0.50.0" } }));
    const response = await publicGitHubRequest("https://github.com/openai/codex/releases/latest", { followRedirects: false, fetchImpl });
    expect(response.status).toBe(302);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
