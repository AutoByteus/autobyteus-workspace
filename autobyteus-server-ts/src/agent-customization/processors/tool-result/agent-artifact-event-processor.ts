import {
  BaseToolExecutionResultProcessor,
  type AgentContext,
} from "autobyteus-ts";
import type { ToolResultEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { extractCandidateOutputPath, inferArtifactType } from "../../../utils/artifact-utils.js";
import { resolveAgentRunIdFromRuntimeContext } from "../../utils/core-boundary-id-normalizer.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class AgentArtifactEventProcessor extends BaseToolExecutionResultProcessor {
  static override getName(): string {
    return "AgentArtifactEventProcessor";
  }

  static override getOrder(): number {
    return 100;
  }

  static override isMandatory(): boolean {
    return true;
  }

  async process(event: ToolResultEvent, context: AgentContext): Promise<ToolResultEvent> {
    const runId = resolveAgentRunIdFromRuntimeContext(context);
    const workspaceRoot = context.workspaceRootPath ?? null;
    logger.debug(
      `AgentArtifactEventProcessor: Processing tool '${event.toolName}' for run '${runId}'`,
    );

    try {
      if (event.isDenied || (typeof event.error === "string" && event.error.trim().length > 0)) {
        logger.debug(
          `AgentArtifactEventProcessor: Skipping artifact projection for non-successful tool '${event.toolName}' on run '${runId}'`,
        );
        return event;
      }

      if (event.toolName === "write_file") {
        const pathValue = event.toolArgs?.path;
        if (typeof pathValue === "string") {
          this.notifyPersistence(
            context,
            {
              runId,
              path: pathValue,
              type: "file",
              workspaceRoot,
            },
            null,
          );
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
      if (!outputPath) {
        return event;
      }

      let url: string | null = null;
      if (event.result && typeof event.result === "object" && !Array.isArray(event.result)) {
        const payload = event.result as Record<string, unknown>;
        const outputUrl = payload.output_file_url;
        if (typeof outputUrl === "string") {
          url = outputUrl;
        }
      }

      const artifactType = inferArtifactType(outputPath);
      if (!artifactType) {
        return event;
      }

      this.notifyPersistence(
        context,
        {
          runId,
          path: outputPath,
          type: artifactType,
          workspaceRoot,
        },
        url,
      );
      logger.info(`Emitted ${artifactType} artifact event for run ${runId} at ${outputPath}`);
    } catch (error) {
      logger.error(`Error in AgentArtifactEventProcessor: ${String(error)}`);
    }

    return event;
  }

  private notifyPersistence(
    context: AgentContext,
    artifact: { runId: string; path: string; type: string; workspaceRoot?: string | null },
    url: string | null,
  ): void {
    const payload: Record<string, unknown> = {
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
