import type { AgentRunContext, RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import {
  buildAgentRunFileChangeId,
  type AgentRunFileChangeArtifactType,
  type AgentRunFileChangePayload,
  type AgentRunFileChangeSourceTool,
  type AgentRunFileChangeStatus,
} from "../../../domain/agent-run-file-change.js";
import { canonicalizeAgentRunFileChangePath } from "../../../domain/agent-run-file-change-path.js";
import { inferArtifactType } from "../../../../utils/artifact-utils.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../../../workspaces/workspace-manager.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const nowIso = (): string => new Date().toISOString();

const inferFileChangeArtifactType = (pathValue: string): AgentRunFileChangeArtifactType => {
  const inferred = inferArtifactType(pathValue);
  return inferred === "file"
    || inferred === "image"
    || inferred === "audio"
    || inferred === "video"
    || inferred === "pdf"
    || inferred === "csv"
    || inferred === "excel"
    ? inferred
    : "other";
};

export class FileChangePayloadBuilder {
  constructor(private readonly workspaceManager: WorkspaceManager = getWorkspaceManager()) {}

  build(input: {
    runContext: AgentRunContext<RuntimeAgentRunContext>;
    path: string | null | undefined;
    status: AgentRunFileChangeStatus;
    sourceTool: AgentRunFileChangeSourceTool;
    sourceInvocationId: string | null;
    content?: string | null;
  }): AgentRunFileChangePayload | null {
    const canonicalPath = canonicalizeAgentRunFileChangePath(
      input.path,
      this.resolveWorkspaceRootPath(input.runContext),
    );
    if (!canonicalPath) {
      return null;
    }

    const timestamp = nowIso();
    const payload: AgentRunFileChangePayload = {
      id: buildAgentRunFileChangeId(input.runContext.runId, canonicalPath),
      runId: input.runContext.runId,
      path: canonicalPath,
      type: inferFileChangeArtifactType(canonicalPath),
      status: input.status,
      sourceTool: input.sourceTool,
      sourceInvocationId: input.sourceInvocationId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (Object.prototype.hasOwnProperty.call(input, "content")) {
      payload.content = input.content ?? null;
    }

    return payload;
  }

  private resolveWorkspaceRootPath(runContext: AgentRunContext<RuntimeAgentRunContext>): string | null {
    const workspaceId = runContext.config.workspaceId;
    if (!workspaceId) {
      return null;
    }

    try {
      return this.workspaceManager.getWorkspaceById(workspaceId)?.getBasePath() ?? null;
    } catch (error) {
      logger.warn(
        `FileChangePayloadBuilder: failed resolving workspace '${workspaceId}' for run '${runContext.runId}': ${String(error)}`,
      );
      return null;
    }
  }
}
