import {
  isConfiguredAgentExecution,
  type ConfiguredExecutionNode,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type {
  ApplicationAgentExecution,
  ApplicationAgentLaunchResult,
  ApplicationExecutionInputDisposition,
  ApplicationExecutionLifecycle,
  ApplicationExecutionMemoryLookup,
  ApplicationExecutionScopeBuildInput,
  ApplicationExecutionStreaming,
  ApplicationExecutionToolReadiness,
  ApplicationPublishedArtifactAccess,
  ApplicationTeamExecution,
  ApplicationTeamLaunchMember,
  ApplicationTeamLaunchResult,
} from "./application-execution-scope-contracts.js";
import {
  buildApplicationExecutionScopeKernel,
  type ApplicationExecutionScopeKernel,
} from "./application-execution-scope-kernel-builder.js";

type ScopeState = "OPEN" | "QUIESCED" | "CLOSED";

const ACCEPTED = Object.freeze({ kind: "ACCEPTED" } as const);
const NOT_AVAILABLE = Object.freeze({ kind: "NOT_AVAILABLE" } as const);

export class ApplicationExecutionScope {
  readonly agentExecution: ApplicationAgentExecution;
  readonly teamExecution: ApplicationTeamExecution;
  readonly streaming: ApplicationExecutionStreaming;
  readonly artifacts: ApplicationPublishedArtifactAccess;
  readonly memory: ApplicationExecutionMemoryLookup;
  readonly toolReadiness: ApplicationExecutionToolReadiness;
  readonly lifecycle: ApplicationExecutionLifecycle;

  private state: ScopeState = "OPEN";
  private closePromise: Promise<void> | null = null;

  private constructor(private readonly kernel: ApplicationExecutionScopeKernel) {
    this.agentExecution = Object.freeze<ApplicationAgentExecution>({
      createAgentRun: async (input) => {
        this.assertAcceptingRuns();
        const result = await this.kernel.agentRunService.createAgentRun(input);
        return Object.freeze<ApplicationAgentLaunchResult>({ runId: result.runId });
      },
      postAgentInput: (runId, message) => this.postAgentInput(runId, message),
      terminateAgentRun: (runId) => this.kernel.agentRunService.terminateAgentRun(runId),
      observeAgentRunLifecycle: (runId, listener) =>
        this.kernel.agentRunService.observeAgentRunLifecycle(runId, listener),
    });
    this.teamExecution = Object.freeze<ApplicationTeamExecution>({
      createTeamRun: async (input) => {
        this.assertAcceptingRuns();
        return this.projectTeamLaunch(await this.kernel.teamRunService.createTeamRun(input));
      },
      createTeamRunFromRootConfig: async (input) => {
        this.assertAcceptingRuns();
        return this.projectTeamLaunch(
          await this.kernel.teamRunService.createTeamRunFromRootConfig(input),
        );
      },
      postTeamInput: (teamRunId, message, targetAgentRunId) =>
        this.postTeamInput(teamRunId, message, targetAgentRunId),
      terminateTeamRun: (teamRunId) =>
        this.kernel.teamRunService.terminateTeamRun(teamRunId),
      observeTeamRunLifecycle: (teamRunId, listener) =>
        this.kernel.teamRunService.observeTeamRunLifecycle(teamRunId, listener),
    });
    this.streaming = Object.freeze<ApplicationExecutionStreaming>({
      attach: (descriptor, listener) => this.kernel.streamSource.attach(descriptor, listener),
    });
    this.artifacts = Object.freeze<ApplicationPublishedArtifactAccess>({
      getRunPublishedArtifacts: (runId) =>
        this.kernel.projectionService.getRunPublishedArtifacts(runId),
      getPublishedArtifactsFromMemoryDir: (memoryDir) =>
        this.kernel.projectionService.getPublishedArtifactsFromMemoryDir(memoryDir),
      getPublishedArtifactRevisionText: (input) =>
        this.kernel.projectionService.getPublishedArtifactRevisionText(input),
      getPublishedArtifactRevisionTextFromMemoryDir: (input) =>
        this.kernel.projectionService.getPublishedArtifactRevisionTextFromMemoryDir(input),
    });
    this.memory = Object.freeze<ApplicationExecutionMemoryLookup>({
      resolveTeamMemberLocation: (input) =>
        this.kernel.memoryLocationService.resolveTeamMemberLocation(input),
    });
    this.toolReadiness = Object.freeze<ApplicationExecutionToolReadiness>({
      publishedArtifactPublisher: this.kernel.publicationService,
      assertReady: () => this.kernel.sessionAuthority.assertReady(),
    });
    this.lifecycle = Object.freeze<ApplicationExecutionLifecycle>({
      quiesce: () => this.quiesce(),
      close: () => this.close(),
    });
  }

  static create(input: ApplicationExecutionScopeBuildInput): ApplicationExecutionScope {
    const kernel = buildApplicationExecutionScopeKernel(input);
    try {
      return new ApplicationExecutionScope(kernel);
    } catch (error) {
      try {
        kernel.abortConstruction();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "Application execution scope construction failed.",
        );
      }
      throw error;
    }
  }

  abortConstruction(): void {
    if (this.state === "CLOSED") return;
    this.state = "CLOSED";
    this.kernel.abortConstruction();
  }

  private assertAcceptingRuns(): void {
    if (this.state !== "OPEN") {
      throw new Error("Application execution is not accepting new runs.");
    }
  }

  private async postAgentInput(
    runId: string,
    message: Parameters<ApplicationAgentExecution["postAgentInput"]>[1],
  ): Promise<ApplicationExecutionInputDisposition> {
    const run = await this.kernel.agentRunService.resolveAgentRun(runId);
    if (!run) return NOT_AVAILABLE;
    return mapInputDisposition(await run.postUserMessage(message));
  }

  private async postTeamInput(
    teamRunId: string,
    message: Parameters<ApplicationTeamExecution["postTeamInput"]>[1],
    targetAgentRunId: string | null,
  ): Promise<ApplicationExecutionInputDisposition> {
    const run = await this.kernel.teamRunService.resolveActiveTeamRun(teamRunId);
    if (!run) return NOT_AVAILABLE;
    return mapInputDisposition(await run.postMessage(message, targetAgentRunId));
  }

  private projectTeamLaunch(
    run: Awaited<ReturnType<ApplicationExecutionScopeKernel["teamRunService"]["createTeamRun"]>>,
  ): ApplicationTeamLaunchResult {
    const members: ApplicationTeamLaunchMember[] = [];
    const visit = (nodes: readonly ConfiguredExecutionNode[]): void => {
      for (const node of nodes) {
        if (isConfiguredAgentExecution(node)) {
          members.push(Object.freeze({
            memberAddress: node.address,
            agentRunId: node.agentRunId,
          }));
        } else {
          visit(node.members);
        }
      }
    };
    visit(run.getExecutionTreeSnapshot().rootTeam.members);
    return Object.freeze({ teamRunId: run.teamRunId, members: Object.freeze(members) });
  }

  private quiesce(): void {
    if (this.state !== "OPEN") return;
    this.state = "QUIESCED";
    this.kernel.sessionAuthority.blockNewSessions();
  }

  private close(): Promise<void> {
    this.closePromise ??= this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    const errors: unknown[] = [];
    this.quiesce();
    try {
      await this.kernel.shutdownCoordinator.stopAllRuns();
    } catch (error) {
      errors.push(error);
    }
    try {
      this.kernel.sessionAuthority.close();
    } catch (error) {
      errors.push(error);
    }
    this.state = "CLOSED";
    if (errors.length) {
      throw new AggregateError(errors, "Application execution scope close failed.");
    }
  }
}

const mapInputDisposition = (
  result: { accepted: boolean; message?: string },
): ApplicationExecutionInputDisposition => result.accepted
  ? ACCEPTED
  : Object.freeze({ kind: "REJECTED", message: result.message ?? null });
