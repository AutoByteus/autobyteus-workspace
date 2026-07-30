export type ApplicationTeamRunShutdownPort = {
  stopAllTeamRuns(): Promise<void>;
};

export type ApplicationAgentRunShutdownPort = {
  stopAllAgentRuns(): Promise<void>;
};

export class ApplicationRunShutdownAuthority {
  private stopPromise: Promise<void> | null = null;

  constructor(
    private readonly teamRuns: ApplicationTeamRunShutdownPort,
    private readonly agentRuns: ApplicationAgentRunShutdownPort,
  ) {}

  stopAllRuns(): Promise<void> {
    this.stopPromise ??= this.stopAllRunsInternal();
    return this.stopPromise;
  }

  private async stopAllRunsInternal(): Promise<void> {
    const errors: unknown[] = [];
    try {
      await this.teamRuns.stopAllTeamRuns();
    } catch (error) {
      errors.push(error);
    }
    try {
      await this.agentRuns.stopAllAgentRuns();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        "Application run shutdown failed.",
      );
    }
  }
}
