import fs from "node:fs";
import path from "node:path";
import { BaseToolExecutionResultProcessor, type AgentContext } from "autobyteus-ts";
import type { ToolResultEvent } from "autobyteus-ts/agent/events/agent-events.js";
import { MediaStorageService } from "../../../services/media-storage-service.js";
import { extractCandidateOutputPath, inferArtifactType } from "../../../utils/artifact-utils.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class MediaToolResultUrlTransformerProcessor extends BaseToolExecutionResultProcessor {
  private mediaStorageService: MediaStorageService;

  constructor() {
    super();
    this.mediaStorageService = new MediaStorageService();
    logger.debug("MediaToolResultUrlTransformerProcessor initialized.");
  }

  static override getName(): string {
    return "MediaToolResultUrlTransformerProcessor";
  }

  static override getOrder(): number {
    return 90;
  }

  static override isMandatory(): boolean {
    return true;
  }

  async process(event: ToolResultEvent, context: AgentContext): Promise<ToolResultEvent> {
    const agentId = context.agentId;
    const toolName = event.toolName;

    try {
      const candidatePath = extractCandidateOutputPath(
        event.toolArgs ?? null,
        event.result,
      );

      if (!candidatePath) {
        return event;
      }

      const artifactType = inferArtifactType(candidatePath);
      if (!artifactType || !["image", "audio", "video", "pdf", "csv", "excel"].includes(artifactType)) {
        return event;
      }

      let filePath = candidatePath;
      if (!path.isAbsolute(filePath) && context.workspace) {
        try {
          const basePath = context.workspace.getBasePath();
          if (basePath) {
            const possiblePath = path.join(basePath, filePath);
            if (fs.existsSync(possiblePath)) {
              filePath = possiblePath;
            }
          }
        } catch (error) {
          logger.warn(`Failed to resolve relative path against workspace: ${String(error)}`);
        }
      }

      const desiredName = path.basename(filePath);
      const newUrl = await this.mediaStorageService.storeMediaAndGetUrl(
        filePath,
        desiredName,
      );

      const resultPayload: Record<string, unknown> = {
        output_file_url: newUrl,
      };
      if (filePath) {
        resultPayload.local_file_path = filePath;
      }

      if (event.result && typeof event.result === "object" && !Array.isArray(event.result)) {
        Object.assign(event.result as Record<string, unknown>, resultPayload);
      } else {
        resultPayload.original_output = event.result;
        event.result = resultPayload;
      }

      logger.info(
        `Agent ${agentId}: Transformed media result for ${toolName} to server-hosted URL: ${newUrl}`,
      );
    } catch (error) {
      logger.error(
        `Agent ${agentId}: Error during media URL transformation for ${toolName}: ${String(error)}`,
      );
    }

    return event;
  }
}
