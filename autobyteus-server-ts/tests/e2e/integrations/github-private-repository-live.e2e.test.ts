/**
 * Live check (autobyteus-627, AC-001, AC-003, AC-004, AC-005; AR-001): the GitHub client's access rule against real
 * GitHub, with the GitHub test token as this node's token.
 *
 * Against a private repository the token can read (found through `/user/repos`; its name is never printed or
 * written): without a token the client gives the "connect GitHub" text; with the token, the repository metadata, the
 * head (ls-refs) and the commit-pinned archive (codeload, with the header) succeed, and the archive is a gzip file
 * with mode 0600. Against a repository name the token can't read (a name that does not exist): REST and ls-refs give
 * the "no access" text, never "rejected" (AR-001: ls-refs answers 404 for a valid token without access). With an
 * invalid token: the "rejected" text. No message holds a token.
 * Read-only on GitHub.
 * Gate: RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1, with AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault holding
 * `test.github.token` (read-only). Without the secret the test is skipped with its reason (AUTOBYTEUS_LIVE_STRICT=1
 * fails instead). The token expires 2026-11-25; after that GitHub refuses it (renew the token).
 * Prerequisites: network access to api.github.com, codeload.github.com and github.com; the token can read at least one
 * private repository.
 * Command: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/integrations/github-private-repository-live.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";
import { GitHubRepositoryClient } from "../../../src/integrations/github/github-repository-client.js";
import { normalizeGitHubRepositorySource } from "../../../src/integrations/github/github-repository-source.js";
import { GitHubRateLimitGate, setGitHubRateLimitGateForTests } from "../../../src/integrations/github/github-rate-limit-gate.js";

const GATE = process.env["RUN_GITHUB_PRIVATE_REPOSITORY_E2E"] === "1";

/** The thrown message of `operation`; fails when it does not throw. */
const messageOf = async (operation: () => Promise<unknown>): Promise<string> => {
  try {
    await operation();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the operation to fail");
};

describe.skipIf(!GATE)("GitHub private repositories through the access rule (live)", () => {
  let workDir: string;

  beforeAll(() => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "github-private-live-"));
    setGitHubRateLimitGateForTests(new GitHubRateLimitGate(() => path.join(workDir, "rate-limit.json")));
  });

  afterAll(() => {
    setGitHubRateLimitGateForTests(null);
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it("reads and downloads a private repository with the token, and names each failure", async (context) => {
    const value = (await readLiveTestSecret(context, "test.github.token")).revealToTrustedConsumer();
    // The server's own SecretValue (the test vault helper reads with autobyteus-ts's source copy).
    const token = SecretValue.fromString(value);

    // A private repository the token can read (test-side listing; its name is never printed).
    const listing = await fetch("https://api.github.com/user/repos?visibility=private&per_page=100", {
      headers: { Authorization: `Bearer ${value}`, Accept: "application/vnd.github+json", "User-Agent": "AutoByteus" },
    });
    expect(listing.status, "GitHub /user/repos with the test token").toBe(200);
    const repositories = (await listing.json()) as Array<{ full_name: string; private: boolean }>;
    const privateRepository = repositories.find((repository) => repository.private);
    expect(privateRepository, "the test token can read a private repository").toBeDefined();
    const source = normalizeGitHubRepositorySource(`https://github.com/${privateRepository!.full_name}`);

    const messages: string[] = [];

    // Not connected: the "connect GitHub" text.
    const notConnected = new GitHubRepositoryClient({ readToken: async () => null });
    const notConnectedMessage = await messageOf(() => notConnected.fetchRepositoryRevisionMetadata(source));
    messages.push(notConnectedMessage);
    expect(notConnectedMessage).toBe(
      `GitHub repository not found, or it is private: ${source.canonicalUrl}. To use a private repository, connect GitHub on this node.`,
    );
    messages.push(await messageOf(() => notConnected.fetchDefaultBranchHead(source.owner, source.repo)));
    expect(messages.at(-1)).toContain("connect GitHub on this node");

    // Connected: metadata, head and the commit-pinned archive.
    let reads = 0;
    const connected = new GitHubRepositoryClient({ readToken: async () => { reads += 1; return token; } });
    const metadata = await connected.fetchRepositoryRevisionMetadata(source);
    expect(metadata.latestRevision).toMatch(/^[0-9a-f]{40}$/);
    const head = await connected.fetchDefaultBranchHead(metadata.owner, metadata.repo);
    expect(head).toEqual({ defaultBranch: metadata.defaultBranch, latestRevision: metadata.latestRevision });
    const archive = path.join(workDir, "repository.tar.gz");
    await connected.downloadArchive(metadata.owner, metadata.repo, metadata.latestRevision, archive);
    const bytes = fs.readFileSync(archive);
    expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b]);
    expect(fs.statSync(archive).mode & 0o777).toBe(0o600);
    expect(reads, "the token is read only after GitHub answered 'not visible'").toBeGreaterThanOrEqual(3);

    // A public repository never reads the token.
    let publicReads = 0;
    const publicClient = new GitHubRepositoryClient({ readToken: async () => { publicReads += 1; return token; } });
    await publicClient.fetchDefaultBranchHead("AutoByteus", "autobyteus-workspace");
    expect(publicReads).toBe(0);

    // AR-001: a repository the valid token can't read gives "no access" on REST and on ls-refs, never "rejected".
    const missing = normalizeGitHubRepositorySource(`https://github.com/${source.owner}/autobyteus-627-missing-${Date.now()}`);
    const noAccessRest = await messageOf(() => connected.fetchRepositoryRevisionMetadata(missing));
    const noAccessHead = await messageOf(() => connected.fetchDefaultBranchHead(missing.owner, missing.repo));
    messages.push(noAccessRest, noAccessHead);
    for (const message of [noAccessRest, noAccessHead]) {
      expect(message).toBe(
        `GitHub repository not found, or this node's GitHub token can't read it: ${missing.canonicalUrl}. Give the token access to this repository with Contents: read.`,
      );
    }

    // An invalid token: "rejected" on REST and on ls-refs.
    const invalid = SecretValue.fromString(`github_pat_${"0".repeat(22)}_${"0".repeat(59)}`);
    const rejectedClient = new GitHubRepositoryClient({ readToken: async () => invalid });
    const rejectedRest = await messageOf(() => rejectedClient.fetchRepositoryRevisionMetadata(source));
    const rejectedHead = await messageOf(() => rejectedClient.fetchDefaultBranchHead(source.owner, source.repo));
    messages.push(rejectedRest, rejectedHead);
    for (const message of [rejectedRest, rejectedHead]) {
      expect(message).toBe("GitHub rejected this node's GitHub token (expired or revoked). Reconnect GitHub on this node.");
    }

    // Custody: no message holds the token, its Basic form or a signed URL.
    const basic = Buffer.from(`x-access-token:${value}`).toString("base64");
    for (const message of messages) {
      expect(message.includes(value)).toBe(false);
      expect(message.includes(basic)).toBe(false);
      expect(message).not.toMatch(/token=/);
    }
  }, 120_000);
});
