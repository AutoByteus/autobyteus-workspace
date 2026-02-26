import type { TeamRoutingPort } from "autobyteus-ts";
import type { RunVersion } from "../envelope/envelope-builder.js";

export class MissingRoutingAdapterError extends Error {
  readonly teamRunId: string;

  constructor(teamRunId: string) {
    super(`No routing adapter is registered for teamRunId '${teamRunId}'.`);
    this.name = "MissingRoutingAdapterError";
    this.teamRunId = teamRunId;
  }
}

export type RoutingAdapterRegistration = {
  teamRunId: string;
  runVersion: RunVersion;
  adapter: TeamRoutingPort;
};

export class TeamRoutingPortAdapterRegistry {
  private readonly byTeamRunId = new Map<string, RoutingAdapterRegistration>();

  initialize(registration: RoutingAdapterRegistration): void {
    this.byTeamRunId.set(registration.teamRunId, registration);
  }

  resolve(teamRunId: string): TeamRoutingPort {
    const registration = this.byTeamRunId.get(teamRunId);
    if (!registration) {
      throw new MissingRoutingAdapterError(teamRunId);
    }
    return registration.adapter;
  }

  tryResolve(teamRunId: string): TeamRoutingPort | null {
    const registration = this.byTeamRunId.get(teamRunId);
    if (!registration) {
      return null;
    }
    return registration.adapter;
  }

  resolveRunVersion(teamRunId: string): RunVersion {
    const registration = this.byTeamRunId.get(teamRunId);
    if (!registration) {
      throw new MissingRoutingAdapterError(teamRunId);
    }
    return registration.runVersion;
  }

  dispose(teamRunId: string): boolean {
    return this.byTeamRunId.delete(teamRunId);
  }

  size(): number {
    return this.byTeamRunId.size;
  }
}
