export type ApplicationTeamRunStopper = {
  stopAllTeamRuns(): Promise<void>;
};

export type ApplicationAgentRunStopper = {
  stopAllAgentRuns(): Promise<void>;
};

export class ApplicationRunShutdownCoordinator {
  private stopPromise: Promise<void> | null = null;

  constructor(
    private readonly teamRuns: ApplicationTeamRunStopper,
    private readonly agentRuns: ApplicationAgentRunStopper,
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
