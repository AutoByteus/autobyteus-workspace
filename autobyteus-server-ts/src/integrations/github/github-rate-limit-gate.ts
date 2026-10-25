import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { writeAtomicJsonSync } from "../../persistence/file/atomic-json-sync.js";

/**
 * GitHub's hosts by how they limit this node: `api` is the REST API (`api.github.com`, the
 * 60-per-hour quota); `web` is github.com's git service and release pages and the codeload
 * archives (no REST quota, undocumented throttling).
 */
export type GitHubGateFamily = "api" | "web";

/** A limiting answer without GitHub's reset or retry time waits this long. */
const DEFAULT_WAIT_MS = 60_000;

const formatClockTime = (time: Date): string => time.toTimeString().slice(0, 5);

/** A GitHub request refused, or answered, while GitHub limits this node. */
export class GitHubRateLimitError extends Error {
  constructor(readonly resetAt: Date) {
    super(`GitHub rate limit reached; try again after ${formatClockTime(resetAt)}.`);
    this.name = "GitHubRateLimitError";
  }
}

type BlockedTimes = Record<GitHubGateFamily, number | null>;

const parseTime = (value: unknown): number | null => {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
};

/**
 * The node's "GitHub blocked until" time per family, learned from GitHub's own answers and taken
 * as sent. Kept in `<app-data>/github/rate-limit.json` (`{ api, web }`), so a stop survives a
 * restart. A missing, unreadable or past time, or a file of another shape, means not blocked.
 */
export class GitHubRateLimitGate {
  private times: BlockedTimes = { api: null, web: null };
  private loaded = false;

  constructor(private readonly resolveFilePath: () => string) {}

  isBlocked(family: GitHubGateFamily, now: Date = new Date()): boolean {
    const until = this.current()[family];
    return until !== null && until > now.getTime();
  }

  /** The time GitHub allows requests of this family again; null when not blocked. */
  blockedUntil(family: GitHubGateFamily, now: Date = new Date()): Date | null {
    return this.isBlocked(family, now) ? new Date(this.current()[family]!) : null;
  }

  /** Throws `GitHubRateLimitError` before a request GitHub has asked this node not to make yet. */
  assertOpen(family: GitHubGateFamily, now: Date = new Date()): void {
    const until = this.blockedUntil(family, now);
    if (until) throw new GitHubRateLimitError(until);
  }

  /** Learns the family's reset time from a limiting answer; returns it when the answer is one. */
  learnFrom(family: GitHubGateFamily, response: Pick<Response, "status" | "headers">, now: Date = new Date()): Date | null {
    const resetAt = family === "api" ? apiResetTime(response, now) : webResetTime(response, now);
    if (!resetAt) return null;
    const current = this.current()[family];
    if (current === null || resetAt.getTime() > current) {
      this.times = { ...this.times, [family]: resetAt.getTime() };
      this.persist();
    }
    return resetAt;
  }

  private current(): BlockedTimes {
    if (!this.loaded) {
      this.loaded = true;
      this.times = this.load();
    }
    return this.times;
  }

  private load(): BlockedTimes {
    const filePath = this.resolveFilePath();
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown> | null;
      return { api: parseTime(parsed?.api), web: parseTime(parsed?.web) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`GITHUB_RATE_LIMIT_FILE_UNREADABLE:${filePath}`, error);
      }
      return { api: null, web: null };
    }
  }

  private persist(): void {
    const filePath = this.resolveFilePath();
    const iso = (time: number | null) => time === null ? null : new Date(time).toISOString();
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      writeAtomicJsonSync(filePath, { api: iso(this.times.api), web: iso(this.times.web) });
    } catch (error) {
      console.warn(`GITHUB_RATE_LIMIT_FILE_WRITE_FAILED:${filePath}`, error);
    }
  }
}

const retryAfter = (response: Pick<Response, "headers">, now: Date): Date | null => {
  const raw = response.headers.get("retry-after");
  const seconds = Number(raw);
  return raw !== null && Number.isFinite(seconds) ? new Date(now.getTime() + seconds * 1000) : null;
};

/** The REST API's reset time for a rate-limited answer, as sent; `null` when it is not a rate limit. */
const apiResetTime = (response: Pick<Response, "status" | "headers">, now: Date): Date | null => {
  if (response.status !== 403 && response.status !== 429) return null;
  const retry = retryAfter(response, now);
  if (retry) return retry;
  if (response.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    if (Number.isFinite(reset) && reset > 0) return new Date(reset * 1000);
  }
  return response.status === 429 ? new Date(now.getTime() + DEFAULT_WAIT_MS) : null;
};

/** github.com's and codeload's throttling: 429 or 503, with `retry-after` when sent. */
const webResetTime = (response: Pick<Response, "status" | "headers">, now: Date): Date | null => {
  if (response.status !== 429 && response.status !== 503) return null;
  return retryAfter(response, now) ?? new Date(now.getTime() + DEFAULT_WAIT_MS);
};

let singleton: GitHubRateLimitGate | null = null;
/** The node's process gate for GitHub's hosts. */
export const getGitHubRateLimitGate = (): GitHubRateLimitGate =>
  singleton ??= new GitHubRateLimitGate(() => path.join(appConfigProvider.config.getAppDataDir(), "github", "rate-limit.json"));
export const setGitHubRateLimitGateForTests = (gate: GitHubRateLimitGate | null): void => { singleton = gate; };
