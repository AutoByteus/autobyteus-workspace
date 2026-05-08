import { BaseToolInvocationPreprocessor } from "autobyteus-ts";
import type { AgentContext } from "autobyteus-ts";
import type { ToolInvocation } from "autobyteus-ts/agent/tool-invocation.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { resolveAgentRunIdFromRuntimeContext } from "../../utils/core-boundary-id-normalizer.js";
import { getMediaPathResolver } from "../../../agent-tools/media/media-tool-path-resolver.js";
import { parseMediaInputImages } from "../../../agent-tools/media/media-tool-input-parsers.js";

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

  private async normalizeList(
    items: string[],
    workspaceRootPath: string | null,
    agentRunId: string,
  ): Promise<string[]> {
    const normalized: string[] = [];
    const pathResolver = getMediaPathResolver();

    for (const entryRaw of items) {
      const entry = entryRaw.trim();
      if (!entry) {
        continue;
      }
      try {
        normalized.push(
          pathResolver.resolveInputImageReference(entry, {
            agentId: agentRunId,
            workspaceRootPath,
          }),
        );
      } catch (error) {
        logger.warn(
          `Agent run '${agentRunId}': failed to normalize media input path '${entry}': ${String(error)}. Skipping.`,
        );
      }
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
    const agentRunId = resolveAgentRunIdFromRuntimeContext(context);
    const workspaceRootPath = context.workspaceRootPath ?? null;

    const imagesVal = args["input_images"];
    if (imagesVal) {
      let items: string[] = [];
      try {
        items = parseMediaInputImages(imagesVal) ?? [];
      } catch {
        logger.warn(
          `Agent run '${agentRunId}': input_images has unsupported type ${typeof imagesVal}; skipping normalization.`,
        );
      }

      const normalized = await this.normalizeList(items, workspaceRootPath, agentRunId);
      if (normalized.length) {
        args["input_images"] = normalized;
      }
    }

    const maskVal = args["mask_image"];
    if (maskVal && typeof maskVal === "string") {
      const maskList = await this.normalizeList([maskVal], workspaceRootPath, agentRunId);
      if (maskList.length) {
        args["mask_image"] = maskList[0];
      }
    }

    invocation.arguments = args;
    return invocation;
  }
}
