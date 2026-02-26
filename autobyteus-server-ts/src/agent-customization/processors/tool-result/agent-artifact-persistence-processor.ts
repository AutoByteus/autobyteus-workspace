import {
  BaseToolExecutionResultProcessor,
  type AgentContext,
} from "autobyteus-ts";
import type { ToolResultEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { ArtifactService } from "../../../agent-artifacts/services/artifact-service.js";
import { extractCandidateOutputPath, inferArtifactType } from "../../../utils/artifact-utils.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type ArtifactServiceLike = {
  createArtifact: (options: {
    runId: string;
    path: string;
    type: string;
    url?: string | null;
    workspaceRoot?: string | null;
  }) => Promise<{
    id?: string | null;
    runId: string;
    path: string;
    type: string;
    workspaceRoot?: string | null;
  }>;
};

export class AgentArtifactPersistenceProcessor extends BaseToolExecutionResultProcessor {
  private artifactService: ArtifactServiceLike;

  constructor(artifactService?: ArtifactServiceLike) {
    super();
    this.artifactService = artifactService ?? ArtifactService.getInstance();
  }

  static override getName(): string {
    return "AgentArtifactPersistenceProcessor";
  }

  static override getOrder(): number {
    return 100;
  }

  static override isMandatory(): boolean {
    return true;
  }

  async process(event: ToolResultEvent, context: AgentContext): Promise<ToolResultEvent> {
    const runId = context.agentId;
    const workspaceRoot = context.workspace?.getBasePath?.() ?? null;
    logger.debug(
      `AgentArtifactPersistenceProcessor: Processing tool '${event.toolName}' for run '${runId}'`,
    );

    try {
      if (event.toolName === "write_file") {
        const pathValue = event.toolArgs?.path;
        if (typeof pathValue === "string") {
          const artifact = await this.artifactService.createArtifact({
            runId,
            path: pathValue,
            type: "file",
            url: null,
            workspaceRoot,
          });
          this.notifyPersistence(context, artifact, null);
        }
        return event;
      }

      if (event.toolName === "edit_file") {
        const pathValue = event.toolArgs?.path;
        if (typeof pathValue === "string") {
          const artifactType = inferArtifactType(pathValue) ?? "file";
          this.notifyUpdate(context, {
            path: pathValue,
            agent_id: runId,
            type: artifactType,
            workspace_root: workspaceRoot ?? undefined,
          });
        }
        return event;
      }

      const outputPath = extractCandidateOutputPath(event.toolArgs, event.result);
      if (outputPath) {
        let url: string | null = null;
        if (event.result && typeof event.result === "object" && !Array.isArray(event.result)) {
          const payload = event.result as Record<string, unknown>;
          const outputUrl = payload.output_file_url;
          if (typeof outputUrl === "string") {
            url = outputUrl;
          }
        }

        const artifactType = inferArtifactType(outputPath);
        if (artifactType) {
          const artifact = await this.artifactService.createArtifact({
            runId,
            path: outputPath,
            type: artifactType,
            url,
            workspaceRoot,
          });
          this.notifyPersistence(context, artifact, url);
          logger.info(
            `Persisted generic ${artifactType} artifact for run ${runId} at ${outputPath}`,
          );
        }
      }
    } catch (error) {
      logger.error(`Error in AgentArtifactPersistenceProcessor: ${String(error)}`);
    }

    return event;
  }

  private notifyPersistence(
    context: AgentContext,
    artifact: { id?: string | null; runId: string; path: string; type: string; workspaceRoot?: string | null },
    url: string | null,
  ): void {
    const payload: Record<string, unknown> = {
      artifact_id: artifact.id,
      path: artifact.path,
      agent_id: artifact.runId,
      type: artifact.type,
    };

    if (artifact.workspaceRoot) {
      payload.workspace_root = artifact.workspaceRoot;
    }
    if (url) {
      payload.url = url;
    }

    context.statusManager?.notifier?.notifyAgentArtifactPersisted?.(payload);
  }

  private notifyUpdate(context: AgentContext, payload: Record<string, unknown>): void {
    context.statusManager?.notifier?.notifyAgentArtifactUpdated?.(payload);
  }
}
