import fs from "node:fs";
import path from "node:path";
import { BaseToolInvocationPreprocessor } from "autobyteus-ts";
import type { AgentContext } from "autobyteus-ts";
import type { ToolInvocation } from "autobyteus-ts/agent/tool-invocation.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { FileSystemWorkspace } from "../../../workspaces/filesystem-workspace.js";

const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class MediaInputPathNormalizationPreprocessor extends BaseToolInvocationPreprocessor {
  static TARGET_TOOLS = new Set(["generate_image", "edit_image"]);

  constructor() {
    super();
    logger.debug("MediaInputPathNormalizationPreprocessor initialized.");
  }

  static override getName(): string {
    return "MediaInputPathNormalizationPreprocessor";
  }

  static override getOrder(): number {
    return 50;
  }

  static override isMandatory(): boolean {
    return true;
  }

  private isAutobyteusProvider(provider?: unknown): boolean {
    if (provider === null || provider === undefined) {
      return false;
    }
    const providerValue =
      typeof provider === "object" && provider && "value" in provider
        ? String((provider as { value: unknown }).value)
        : String(provider);
    return providerValue.toUpperCase() === LLMProvider.AUTOBYTEUS;
  }

  private async resolveLlmProvider(context: AgentContext): Promise<unknown | null> {
    const llmModel = context?.llmInstance?.model as
      | { modelIdentifier?: string; provider?: unknown }
      | undefined;
    if (!llmModel) {
      return null;
    }

    const modelIdentifier = llmModel.modelIdentifier;
    if (typeof modelIdentifier === "string" && modelIdentifier.trim().length > 0) {
      try {
        const provider = await LLMFactory.getProvider(modelIdentifier);
        if (provider) {
          return provider;
        }
      } catch (error) {
        logger.debug(
          `Failed to resolve provider from LLMFactory for model '${modelIdentifier}': ${String(error)}`,
        );
      }
    }

    return llmModel.provider ?? null;
  }

  private async modelProviderIsAutobyteus(context: AgentContext): Promise<boolean> {
    const provider = await this.resolveLlmProvider(context);
    return this.isAutobyteusProvider(provider);
  }

  private isUrl(value: string): boolean {
    return (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:")
    );
  }

  private async normalizeList(
    items: string[],
    workspace: AgentContext["workspace"],
    agentId: string,
  ): Promise<string[]> {
    const normalized: string[] = [];

    for (const entryRaw of items) {
      const entry = entryRaw.trim();
      if (!entry) {
        continue;
      }
      if (this.isUrl(entry)) {
        normalized.push(entry);
        continue;
      }

      let resolvedPath: string | null = null;
      if (path.isAbsolute(entry)) {
        resolvedPath = entry;
      } else if (workspace instanceof FileSystemWorkspace) {
        try {
          resolvedPath = workspace.getAbsolutePath(entry);
        } catch (error) {
          logger.warn(
            `Agent '${agentId}': unable to resolve relative path '${entry}': ${String(error)}`,
          );
          continue;
        }
      } else {
        logger.warn(
          `Agent '${agentId}': no workspace to resolve relative path '${entry}'. Skipping.`,
        );
        continue;
      }

      if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        logger.warn(
          `Agent '${agentId}': path '${resolvedPath ?? entry}' is not a file. Skipping.`,
        );
        continue;
      }

      normalized.push(resolvedPath);
    }

    return normalized;
  }

  async process(invocation: ToolInvocation, context: AgentContext): Promise<ToolInvocation> {
    const toolName = invocation.name ?? "";
    if (!MediaInputPathNormalizationPreprocessor.TARGET_TOOLS.has(toolName)) {
      return invocation;
    }

    if (!(await this.modelProviderIsAutobyteus(context))) {
      return invocation;
    }

    const args = (invocation.arguments ?? {}) as Record<string, unknown>;
    const agentId = context.agentId;
    const workspace = context.workspace;

    const imagesVal = args["input_images"];
    if (imagesVal) {
      let items: string[] = [];
      if (typeof imagesVal === "string") {
        items = imagesVal.split(",").map((entry) => entry.trim()).filter(Boolean);
      } else if (Array.isArray(imagesVal)) {
        items = imagesVal.filter((entry) => typeof entry === "string") as string[];
      } else {
        logger.warn(
          `Agent '${agentId}': input_images has unsupported type ${typeof imagesVal}; skipping normalization.`,
        );
      }

      const normalized = await this.normalizeList(items, workspace, agentId);
      if (normalized.length) {
        args["input_images"] = normalized.join(",");
      }
    }

    const maskVal = args["mask_image"];
    if (maskVal && typeof maskVal === "string" && !this.isUrl(maskVal)) {
      const maskList = await this.normalizeList([maskVal], workspace, agentId);
      if (maskList.length) {
        args["mask_image"] = maskList[0];
      }
    }

    invocation.arguments = args;
    return invocation;
  }
}
