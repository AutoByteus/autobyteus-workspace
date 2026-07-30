import fs from 'fs/promises';
import pathModule from 'path';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { addFileToolPathParameters } from './file-tool-schema.js';
import { resolveFileToolPath } from './workspace-path-utils.js';

const DESCRIPTION = [
  'Creates or overwrites a file with specified content.',
  "File paths use trusted-local semantics: absolute paths are used directly; relative paths require an explicit absolute base_dir and are never resolved from workspace, process, or shell cd state.",
  "'content' is the string content to write.",
  "Creates parent directories if they don't exist.",
  'Raises ValueError if a relative path is given without an absolute base_dir.',
  'Raises IOError if file writing fails.'
].join(' ');

const argumentSchema = new ParameterSchema();
addFileToolPathParameters(argumentSchema);
argumentSchema.addParameter(new ParameterDefinition({
  name: 'content',
  type: ParameterType.STRING,
  description: "Parameter 'content' for tool 'write_file'.",
  required: true
}));

type AgentContextLike = { agentId: string; workspaceRootPath?: string | null };

export async function writeFile(
  context: AgentContextLike,
  path: string,
  baseDir: string | null | undefined,
  content: string
): Promise<string> {
  const finalPath = resolveFileToolPath(context, path, baseDir);

  try {
    const dirPath = pathModule.dirname(finalPath);
    if (dirPath) {
      await fs.mkdir(dirPath, { recursive: true });
    }
    await fs.writeFile(finalPath, content, 'utf-8');
    return `File created/updated at ${finalPath}`;
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
      category: ToolCategory.FILE_SYSTEM,
      paramNames: ['context', 'path', 'base_dir', 'content']
    })(writeFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
