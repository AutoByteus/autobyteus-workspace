import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { GitHubRepositoryClient } from "../../../../src/integrations/github/github-repository-client.js";
import { normalizeGitHubRepositorySource } from "../../../../src/integrations/github/github-repository-source.js";
import { GitHubRateLimitGate, setGitHubRateLimitGateForTests } from "../../../../src/integrations/github/github-rate-limit-gate.js";
import type { GitHubTokenReader } from "../../../../src/integrations/github/node-github-token.js";

const TOKEN_TEXT = "github_pat_UNIT_TEST_TOKEN_627";
const BASIC = `Basic ${Buffer.from(`x-access-token:${TOKEN_TEXT}`).toString("base64")}`;
const BEARER = `Bearer ${TOKEN_TEXT}`;
const SOURCE = normalizeGitHubRepositorySource("https://github.com/acme/private-pack");
const SHA = "c".repeat(40);
const LS_REFS_MAIN = `0050${SHA} HEAD symref-target:refs/heads/main\n0000`;

const NOT_VISIBLE = "GitHub repository not found, or it is private: https://github.com/acme/private-pack. To use a private repository, connect GitHub on this node.";
const REJECTED = "GitHub rejected this node's GitHub token (expired or revoked). Reconnect GitHub on this node.";
const NO_ACCESS = "GitHub repository not found, or this node's GitHub token can't read it: https://github.com/acme/private-pack. Give the token access to this repository with Contents: read.";
const VAULT_UNAVAILABLE = "GitHub repository not found, or it is private: https://github.com/acme/private-pack. This node's secret vault is unavailable, so its GitHub token can't be used.";

type Call = { url: string; authorization: string | null };

/**
 * A fake GitHub: `answer(url, authorized)` gives the status (and body) for a request with or without a credential.
 * Every call is recorded with its Authorization header.
 */
const fakeGitHub = (answer: (url: string, authorized: boolean) => Response) => {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (resource: string | URL | Request, init?: RequestInit) => {
    const url = String(resource);
    const authorization = (init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? null;
    calls.push({ url, authorization });
    return answer(url, authorization !== null);
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
};

/** GitHub's answers for a private repository: not visible without a credential, readable with it. */
const privateRepository = (url: string, authorized: boolean): Response => {
  if (!authorized) return new Response(null, { status: url.includes(".git/git-upload-pack") ? 401 : 404 });
  if (url.endsWith("/repos/acme/private-pack")) {
    return Response.json({ owner: { login: "acme" }, name: "private-pack", default_branch: "main", html_url: SOURCE.canonicalUrl, private: true });
  }
  if (url.includes("/branches/")) return Response.json({ commit: { sha: SHA } });
  if (url.includes(".git/git-upload-pack")) return new Response(LS_REFS_MAIN);
  if (url.startsWith("https://codeload.github.com/")) return new Response("archive-bytes");
  return new Response(null, { status: 500 });
};

const tokenReader = (reader: GitHubTokenReader = async () => SecretValue.fromString(TOKEN_TEXT)) => vi.fn(reader);

const messageOf = async (operation: () => Promise<unknown>): Promise<string> => {
  try {
    await operation();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a failure");
};

describe("GitHubRepositoryClient access rule (LS-1, C-3, C-4)", () => {
  let workDir: string;
  beforeEach(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "github-access-rule-"));
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => path.join(workDir, "rate-limit.json")));
  });
  afterEach(() => {
    setGitHubRateLimitGateForTests(null);
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it("a public repository is read without a token: the reader is never asked and no request carries a credential", async () => {
    const github = fakeGitHub((url) => (url.includes(".git/git-upload-pack") ? new Response(LS_REFS_MAIN) : new Response(null, { status: 500 })));
    const readToken = tokenReader();
    const client = new GitHubRepositoryClient({ readToken, fetchImpl: github.fetchImpl });
    expect(await client.fetchDefaultBranchHead("acme", "public-pack")).toEqual({ defaultBranch: "main", latestRevision: SHA });
    expect(readToken).not.toHaveBeenCalled();
    expect(github.calls).toEqual([{ url: "https://github.com/acme/public-pack.git/git-upload-pack", authorization: null }]);
  });

  it("REQ-007: a public repository keeps working while this node's stored token is rejected, because the token is never sent", async () => {
    const github = fakeGitHub((url, authorized) => {
      if (authorized) return new Response(null, { status: 401 });
      return url.includes("/branches/") ? Response.json({ commit: { sha: SHA } })
        : Response.json({ owner: { login: "acme" }, name: "public-pack", default_branch: "main", html_url: "https://github.com/acme/public-pack" });
    });
    const readToken = tokenReader();
    const client = new GitHubRepositoryClient({ readToken, fetchImpl: github.fetchImpl });
    const metadata = await client.fetchRepositoryRevisionMetadata(normalizeGitHubRepositorySource("https://github.com/acme/public-pack"));
    expect(metadata.latestRevision).toBe(SHA);
    expect(readToken).not.toHaveBeenCalled();
    expect(github.calls.every((call) => call.authorization === null)).toBe(true);
  });

  it("a private repository: each request goes without a token first, then with the header of its host", async () => {
    const github = fakeGitHub(privateRepository);
    const readToken = tokenReader();
    const client = new GitHubRepositoryClient({ readToken, fetchImpl: github.fetchImpl });

    const metadata = await client.fetchRepositoryRevisionMetadata(SOURCE);
    expect(metadata).toEqual({ owner: "acme", repo: "private-pack", canonicalUrl: SOURCE.canonicalUrl, defaultBranch: "main", latestRevision: SHA });
    expect(await client.fetchDefaultBranchHead("acme", "private-pack")).toEqual({ defaultBranch: "main", latestRevision: SHA });
    const archive = path.join(workDir, "repository.tar.gz");
    await client.downloadArchive("acme", "private-pack", SHA, archive);

    expect(github.calls).toEqual([
      { url: "https://api.github.com/repos/acme/private-pack", authorization: null },
      { url: "https://api.github.com/repos/acme/private-pack", authorization: BEARER },
      { url: "https://api.github.com/repos/acme/private-pack/branches/main", authorization: null },
      { url: "https://api.github.com/repos/acme/private-pack/branches/main", authorization: BEARER },
      { url: "https://github.com/acme/private-pack.git/git-upload-pack", authorization: null },
      { url: "https://github.com/acme/private-pack.git/git-upload-pack", authorization: BASIC },
      { url: `https://codeload.github.com/acme/private-pack/tar.gz/${SHA}`, authorization: null },
      { url: `https://codeload.github.com/acme/private-pack/tar.gz/${SHA}`, authorization: BEARER },
    ]);
    expect(readToken).toHaveBeenCalledTimes(4);
    expect(github.calls.some((call) => call.url.includes(TOKEN_TEXT) || call.url.includes("token="))).toBe(false);
    expect(fs.readFileSync(archive, "utf-8")).toBe("archive-bytes");
    expect(fs.statSync(archive).mode & 0o777).toBe(0o600);
  });

  it.each([
    ["no token is connected", tokenReader(async () => null), privateRepository, NOT_VISIBLE],
    ["the vault is unavailable", tokenReader(async () => { throw new SecretVaultError("VAULT_UNAVAILABLE", true, "SECRET_VAULT_UNAVAILABLE"); }), privateRepository, VAULT_UNAVAILABLE],
    ["GitHub rejects the token (401)", tokenReader(), (_url: string, authorized: boolean) => new Response(null, { status: authorized ? 401 : 404 }), REJECTED],
    ["the token can't see the repository (404)", tokenReader(), () => new Response(null, { status: 404 }), NO_ACCESS],
    ["the token is refused the repository (403)", tokenReader(), (_url: string, authorized: boolean) => new Response(null, { status: authorized ? 403 : 404 }), NO_ACCESS],
  ])("REST metadata when %s gives its own text", async (_case, readToken, answer, expected) => {
    const github = fakeGitHub(answer);
    const message = await messageOf(() => new GitHubRepositoryClient({ readToken, fetchImpl: github.fetchImpl }).fetchRepositoryRevisionMetadata(SOURCE));
    expect(message).toBe(expected);
    expect(message).not.toContain(TOKEN_TEXT);
  });

  it("the update check (ls-refs): 401 without a token, then 401 with it, is 'rejected'; 404 with it is 'no access'", async () => {
    const rejected = fakeGitHub(() => new Response(null, { status: 401 }));
    expect(await messageOf(() => new GitHubRepositoryClient({ readToken: tokenReader(), fetchImpl: rejected.fetchImpl })
      .fetchDefaultBranchHead("acme", "private-pack"))).toBe(REJECTED);
    const noAccess = fakeGitHub((_url, authorized) => new Response(null, { status: authorized ? 404 : 401 }));
    expect(await messageOf(() => new GitHubRepositoryClient({ readToken: tokenReader(), fetchImpl: noAccess.fetchImpl })
      .fetchDefaultBranchHead("acme", "private-pack"))).toBe(NO_ACCESS);
    const notConnected = fakeGitHub(() => new Response(null, { status: 401 }));
    expect(await messageOf(() => new GitHubRepositoryClient({ readToken: tokenReader(async () => null), fetchImpl: notConnected.fetchImpl })
      .fetchDefaultBranchHead("acme", "private-pack"))).toBe(NOT_VISIBLE);
    expect(notConnected.calls).toHaveLength(1);
  });

  it("an archive that codeload answers 404 even with the token is 'no access' (codeload never says 'rejected'); nothing is written", async () => {
    const github = fakeGitHub(() => new Response(null, { status: 404 }));
    const archive = path.join(workDir, "repository.tar.gz");
    const message = await messageOf(() => new GitHubRepositoryClient({ readToken: tokenReader(), fetchImpl: github.fetchImpl })
      .downloadArchive("acme", "private-pack", SHA, archive));
    expect(message).toBe(NO_ACCESS);
    expect(fs.existsSync(archive)).toBe(false);
  });

  it("downloadArchive refuses an existing destination and unsafe names, and reports other failures by status", async () => {
    const github = fakeGitHub(() => new Response("bytes"));
    const client = new GitHubRepositoryClient({ readToken: tokenReader(), fetchImpl: github.fetchImpl });
    const existing = path.join(workDir, "existing.tar.gz");
    fs.writeFileSync(existing, "old");
    await expect(client.downloadArchive("acme", "pack", SHA, existing)).rejects.toThrow();
    expect(fs.readFileSync(existing, "utf-8")).toBe("old");
    await expect(client.downloadArchive("..", "pack", SHA, path.join(workDir, "x.tar.gz"))).rejects.toThrow("Invalid");
    const failing = fakeGitHub(() => new Response(null, { status: 500 }));
    await expect(new GitHubRepositoryClient({ readToken: tokenReader(), fetchImpl: failing.fetchImpl })
      .downloadArchive("acme", "pack", SHA, path.join(workDir, "y.tar.gz"))).rejects.toThrow("GitHub archive download failed (HTTP 500).");
  });

  it("a reader failure that is not the vault's is passed on unchanged", async () => {
    const github = fakeGitHub(privateRepository);
    const failure = new Error("reader bug");
    await expect(new GitHubRepositoryClient({ readToken: tokenReader(async () => { throw failure; }), fetchImpl: github.fetchImpl })
      .fetchRepositoryRevisionMetadata(SOURCE)).rejects.toBe(failure);
  });
});
