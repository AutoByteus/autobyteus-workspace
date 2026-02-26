import {
  tool,
  ToolCategory,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { PromptService } from "../../prompt-engineering/services/prompt-service.js";

const DESCRIPTION =
  "Retrieves the full details of a prompt, formatted as a virtual file with line numbers.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "prompt_id",
    type: ParameterType.STRING,
    description: "The unique ID of the prompt to retrieve.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const splitLines = (content: string): string[] => {
  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
};

export async function getPrompt(
  context: AgentContextLike,
  prompt_id: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`get_prompt tool invoked by agent ${agentId} for prompt ID '${prompt_id}'.`);

  if (!prompt_id) {
    throw new Error("prompt_id is a required argument.");
  }

  try {
    const promptService = new PromptService();
    const prompt = await promptService.getPromptById(prompt_id);

    const numberedLines = splitLines(prompt.promptContent).map(
      (line, index) => `${index + 1}: ${line}`,
    );
    const numberedContent = numberedLines.join("\n");
    const virtualFilename = `prompt_${prompt_id}.md`;

    return `Prompt Details:
- ID: ${prompt.id}
- Name: ${prompt.name}
- Category: ${prompt.category}

File: ${virtualFilename}
\`\`\`markdown
${numberedContent}
\`\`\`

To modify this prompt, use the \`patch_prompt\` tool with prompt_id=${prompt_id} and a unified diff patch.`;
  } catch (error) {
    logger.error(`Error getting prompt ID '${prompt_id}': ${String(error)}`);
    throw error;
  }
}

const TOOL_NAME = "get_prompt";
let cachedTool: BaseTool | null = null;

export function registerGetPromptTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.PROMPT_MANAGEMENT,
    })(getPrompt) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
