import type { RunVersion } from "../envelope/envelope-builder.js";

export class StaleRunVersionError extends Error {
  readonly teamRunId: string;
  readonly expectedRunVersion: RunVersion;
  readonly actualRunVersion: RunVersion;

  constructor(teamRunId: string, expectedRunVersion: RunVersion, actualRunVersion: RunVersion) {
    super(
      `Stale run version detected for teamRunId '${teamRunId}'. ` +
        `Expected '${String(expectedRunVersion)}', received '${String(actualRunVersion)}'.`
    );
    this.name = "StaleRunVersionError";
    this.teamRunId = teamRunId;
    this.expectedRunVersion = expectedRunVersion;
    this.actualRunVersion = actualRunVersion;
  }
}

export class MissingRunVersionError extends Error {
  readonly teamRunId: string;

  constructor(teamRunId: string) {
    super(`Cannot resolve current run version for teamRunId '${teamRunId}'.`);
    this.name = "MissingRunVersionError";
    this.teamRunId = teamRunId;
  }
}

export type ResolveCurrentRunVersion = (
  teamRunId: string
) => Promise<RunVersion | null | undefined> | RunVersion | null | undefined;

export class RunVersionFencingPolicy {
  private readonly resolveCurrentRunVersion: ResolveCurrentRunVersion;

  constructor(resolveCurrentRunVersion: ResolveCurrentRunVersion) {
    this.resolveCurrentRunVersion = resolveCurrentRunVersion;
  }

  async assertCurrentRunVersion(teamRunId: string, runVersion: RunVersion): Promise<void> {
    const current = await this.resolveCurrentRunVersion(teamRunId);
    if (current === null || current === undefined) {
      throw new MissingRunVersionError(teamRunId);
    }
    if (!this.isSameRunVersion(current, runVersion)) {
      throw new StaleRunVersionError(teamRunId, current, runVersion);
    }
  }

  async dropIfStale(teamRunId: string, runVersion: RunVersion): Promise<boolean> {
    const current = await this.resolveCurrentRunVersion(teamRunId);
    if (current === null || current === undefined) {
      return true;
    }
    return !this.isSameRunVersion(current, runVersion);
  }

  private isSameRunVersion(a: RunVersion, b: RunVersion): boolean {
    return String(a) === String(b);
  }
}
