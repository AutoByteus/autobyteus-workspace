import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { writeAtomicJsonSync } from "../../persistence/file/atomic-json-sync.js";

/** A 429 without GitHub's reset or retry headers (a secondary limit) waits this long. */
const SECONDARY_LIMIT_WAIT_MS = 60_000;

const formatClockTime = (time: Date): string => time.toTimeString().slice(0, 5);

/** An `api.github.com` request refused, or answered, while GitHub limits this node. */
export class GitHubRateLimitError extends Error {
  constructor(readonly resetAt: Date) {
    super(`GitHub rate limit reached; try again after ${formatClockTime(resetAt)}.`);
    this.name = "GitHubRateLimitError";
  }
}

/**
 * The node's "GitHub API blocked until" time, learned from GitHub's own answers. The time is
 * kept in `<app-data>/github/rate-limit.json`, so the stop survives a restart. A missing,
 * unreadable or past time means not blocked.
 */
export class GitHubRateLimitGate {
  private blockedUntil: number | null = null;
  private loaded = false;

  constructor(private readonly resolveFilePath: () => string) {}

  isBlocked(now: Date = new Date()): boolean {
    const blockedUntil = this.currentBlockedUntil();
    return blockedUntil !== null && blockedUntil > now.getTime();
  }

  /** Throws `GitHubRateLimitError` before a request GitHub has asked this node not to make yet. */
  assertOpen(now: Date = new Date()): void {
    const blockedUntil = this.currentBlockedUntil();
    if (blockedUntil !== null && blockedUntil > now.getTime()) {
      throw new GitHubRateLimitError(new Date(blockedUntil));
    }
  }

  /** Learns the reset time from a 403/429 answer; returns it when the answer is a rate limit. */
  learnFrom(response: Pick<Response, "status" | "headers">, now: Date = new Date()): Date | null {
    const resetAt = rateLimitResetTime(response, now);
    if (!resetAt) return null;
    const current = this.currentBlockedUntil();
    if (current === null || resetAt.getTime() > current) {
      this.blockedUntil = resetAt.getTime();
      this.persist(resetAt);
    }
    return resetAt;
  }

  private currentBlockedUntil(): number | null {
    if (!this.loaded) {
      this.loaded = true;
      this.blockedUntil = this.load();
    }
    return this.blockedUntil;
  }

  private load(): number | null {
    const filePath = this.resolveFilePath();
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { blockedUntil?: unknown };
      const time = typeof parsed?.blockedUntil === "string" ? Date.parse(parsed.blockedUntil) : Number.NaN;
      return Number.isFinite(time) ? time : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`GITHUB_RATE_LIMIT_FILE_UNREADABLE:${filePath}`, error);
      }
      return null;
    }
  }

  private persist(resetAt: Date): void {
    const filePath = this.resolveFilePath();
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      writeAtomicJsonSync(filePath, { blockedUntil: resetAt.toISOString() });
    } catch (error) {
      console.warn(`GITHUB_RATE_LIMIT_FILE_WRITE_FAILED:${filePath}`, error);
    }
  }
}

/** GitHub's own reset time for a rate-limited answer, as sent; `null` when it is not a rate limit. */
const rateLimitResetTime = (response: Pick<Response, "status" | "headers">, now: Date): Date | null => {
  if (response.status !== 403 && response.status !== 429) return null;
  const retryAfter = Number(response.headers.get("retry-after"));
  if (response.headers.get("retry-after") !== null && Number.isFinite(retryAfter)) {
    return new Date(now.getTime() + retryAfter * 1000);
  }
  if (response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    if (Number.isFinite(reset) && reset > 0) return new Date(reset * 1000);
  }
  return response.status === 429 ? new Date(now.getTime() + SECONDARY_LIMIT_WAIT_MS) : null;
};

let singleton: GitHubRateLimitGate | null = null;
/** The node's process gate for `api.github.com`. */
export const getGitHubRateLimitGate = (): GitHubRateLimitGate =>
  singleton ??= new GitHubRateLimitGate(() => path.join(appConfigProvider.config.getAppDataDir(), "github", "rate-limit.json"));
export const setGitHubRateLimitGateForTests = (gate: GitHubRateLimitGate | null): void => { singleton = gate; };
