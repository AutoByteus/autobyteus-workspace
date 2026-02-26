import {
  tool,
  ToolCategory,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { applyUnifiedDiff, PatchApplicationError } from "autobyteus-ts/utils/diff-utils.js";
import { PromptService } from "../../prompt-engineering/services/prompt-service.js";

const DESCRIPTION =
  "Creates a new prompt revision by applying a unified diff patch to the prompt content.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "prompt_id",
    type: ParameterType.STRING,
    description: "The ID of the prompt to create a revision of.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "patch",
    type: ParameterType.STRING,
    description: "Unified diff patch describing the edits to apply to the prompt content.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const LINE_NUMBER_PATTERN = /^([ +\-])\s*\d+:\s?(.*)$/;

function stripLineNumbers(patch: string): string {
  const lines = patch.match(/.*(?:\r?\n|$)/g) ?? [];
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const stripped: string[] = [];
  for (const line of lines) {
    const cleanLine = line.replace(/\r?\n$/, "");
    const ending = line.slice(cleanLine.length);
    const match = LINE_NUMBER_PATTERN.exec(cleanLine);
    if (match) {
      stripped.push(`${match[1]}${match[2]}${ending}`);
    } else {
      stripped.push(line);
    }
  }

  return stripped.join("");
}

function splitLinesKeepEnds(text: string): string[] {
  const matches = text.match(/.*(?:\n|$)/g) ?? [];
  if (matches.length > 0 && matches[matches.length - 1] === "") {
    matches.pop();
  }
  return matches;
}

export async function patchPrompt(
  context: AgentContextLike,
  prompt_id: string,
  patch: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`patch_prompt tool invoked by agent ${agentId} for prompt ID '${prompt_id}'.`);

  try {
    const promptService = new PromptService();
    const basePrompt = await promptService.getPromptById(prompt_id);
    if (!basePrompt) {
      throw new Error(`Prompt with ID ${prompt_id} not found.`);
    }

    const cleanPatch = stripLineNumbers(patch);
    const originalLines = splitLinesKeepEnds(basePrompt.promptContent);
    const patchedLines = applyUnifiedDiff(originalLines, cleanPatch);
    const newContent = patchedLines.join("");

    const newRevision = await promptService.addNewPromptRevision(prompt_id, newContent);
    const successMessage =
      `Successfully patched prompt. New revision ID: ${String(
        newRevision.id,
      )}. This revision is inactive and ready for testing.`;
    logger.info(successMessage);
    return successMessage;
  } catch (error) {
    logger.error(`Failed to apply patch to prompt '${prompt_id}': ${String(error)}`);
    if (error instanceof PatchApplicationError) {
      throw error;
    }
    throw error;
  }
}

const TOOL_NAME = "patch_prompt";
let cachedTool: BaseTool | null = null;

export function registerPatchPromptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(patchPrompt) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}

export { PatchApplicationError };
