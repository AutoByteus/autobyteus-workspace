import fs from 'fs/promises';
import pathModule from 'path';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';

const DESCRIPTION = [
  'Creates or overwrites a file with specified content.',
  "'path' is the path where the file will be written. If relative, it must be resolved against a configured agent workspace.",
  "'content' is the string content to write.",
  "Creates parent directories if they don't exist.",
  'Raises ValueError if a relative path is given without a valid workspace.',
  'Raises IOError if file writing fails.'
].join(' ');

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'path',
  type: ParameterType.STRING,
  description: "Parameter 'path' for tool 'write_file'. This is expected to be a path.",
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'content',
  type: ParameterType.STRING,
  description: "Parameter 'content' for tool 'write_file'.",
  required: true
}));

type WorkspaceLike = { getBasePath: () => string };
type AgentContextLike = { agentId: string; workspace?: WorkspaceLike | null };

export async function writeFile(
  context: AgentContextLike,
  path: string,
  content: string
): Promise<string> {
  let finalPath = path;
  let returnPath = path;

  if (!pathModule.isAbsolute(path)) {
    const workspace = context.workspace ?? null;
    if (!workspace) {
      throw new Error(
        `Relative path '${path}' provided, but no workspace is configured for agent '${context.agentId}'. A workspace is required to resolve relative paths.`
      );
    }
    const basePath = workspace.getBasePath();
    if (!basePath || typeof basePath !== 'string') {
      throw new Error(
        `Agent '${context.agentId}' has a configured workspace, but it provided an invalid base path ('${basePath}'). Cannot resolve relative path '${path}'.`
      );
    }
    finalPath = pathModule.join(basePath, path);
    returnPath = pathModule.normalize(path);
  } else {
    returnPath = path;
  }

  try {
    finalPath = pathModule.normalize(finalPath);
    const dirPath = pathModule.dirname(finalPath);
    if (dirPath) {
      await fs.mkdir(dirPath, { recursive: true });
    }
    await fs.writeFile(finalPath, content, 'utf-8');
    return `File created/updated at ${returnPath}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not write file at '${finalPath}': ${message}`);
  }
}

const TOOL_NAME = 'write_file';
let cachedTool: BaseTool | null = null;

export function registerWriteFileTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.FILE_SYSTEM
    })(writeFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
