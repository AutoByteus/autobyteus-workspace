import fs from "node:fs";
import path from "node:path";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { BaseAgentWorkspace } from "autobyteus-ts/agent/workspace/base-workspace.js";
import { FileSystemWorkspace } from "../../../workspaces/filesystem-workspace.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class PromptContextBuilder {
  private userRequirementInput: AgentInputUserMessage;
  private workspace: BaseAgentWorkspace | null;
  private agentId: string;

  constructor(userRequirementInput: AgentInputUserMessage, workspace: BaseAgentWorkspace | null) {
    this.userRequirementInput = userRequirementInput;
    this.workspace = workspace;
    this.agentId = workspace?.agentId ?? "unknown_agent";
  }

  private isUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return Boolean(parsed.protocol && parsed.host);
    } catch {
      return false;
    }
  }

  buildContextString(): string {
    if (!this.userRequirementInput.contextFiles || this.userRequirementInput.contextFiles.length === 0) {
      return "No context files were specified for this interaction.";
    }

    const parts: string[] = [];

    for (const contextFile of this.userRequirementInput.contextFiles) {
      if (!ContextFileType.getReadableTextTypes().includes(contextFile.fileType)) {
        continue;
      }

      if (this.isUrl(contextFile.uri)) {
        logger.warn(
          `Agent '${this.agentId}': PromptContextBuilder cannot read URL content for '${contextFile.uri}'. Skipping.`,
        );
        continue;
      }

      const absolutePath = contextFile.uri;

      try {
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
          const content = fs.readFileSync(absolutePath, "utf-8");
          let displayPath = absolutePath;

          if (this.workspace instanceof FileSystemWorkspace) {
            try {
              displayPath = path.relative(this.workspace.rootPath, absolutePath);
            } catch {
              displayPath = absolutePath;
            }
          }

          parts.push(`File: ${displayPath}\n${content}`);
        } else {
          logger.warn(
            `Agent '${this.agentId}': PromptContextBuilder: Context file not found at pre-validated path: '${absolutePath}'.`,
          );
          parts.push(`File: ${absolutePath}\nError: File not found.`);
        }
      } catch (error) {
        logger.error(
          `Agent '${this.agentId}': PromptContextBuilder error reading file '${absolutePath}': ${String(error)}`,
        );
        parts.push(`File: ${absolutePath}\nError: Could not read file (${String(error)}).`);
      }
    }

    return parts.length
      ? parts.join("\n\n")
      : "No readable text-based context files were processed for this interaction.";
  }
}
