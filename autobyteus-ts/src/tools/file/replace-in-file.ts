import fs from 'fs/promises';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { resolveAbsolutePath } from './workspace-path-utils.js';
import { replaceExactBlock, TextEditOperationError } from './text-edit-utils.js';

const DESCRIPTION =
  'Replaces one exact text block in a file without overwriting unrelated content. Provide old_text and new_text, copying old_text exactly from the file including whitespace, indentation, and newlines. Use this after read_file when you know the exact block to replace. If the match is not unique, make old_text more specific or use edit_file for a diff-style patch.';

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'path',
  type: ParameterType.STRING,
  description:
    'The filesystem path to the file to update. This may be absolute or relative to the configured workspace root. It is never resolved from prior shell cd state.',
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'old_text',
  type: ParameterType.STRING,
  description:
    'The exact existing text block to replace. Copy it exactly from the file, including whitespace, indentation, and newlines. Prefer a small unique block.',
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'new_text',
  type: ParameterType.STRING,
  description:
    'The replacement text for old_text. Match the file style exactly, including indentation and line endings.',
  required: true
}));

type AgentContextLike = { agentId: string; workspaceRootPath?: string | null };

export async function replaceInFile(
  context: AgentContextLike,
  path: string,
  old_text: string,
  new_text: string
): Promise<string> {
  const finalPath = resolveAbsolutePath(context, path);

  try {
    await fs.access(finalPath);
  } catch {
    throw new Error(`The file at resolved path ${finalPath} does not exist.`);
  }

  try {
    const originalContent = await fs.readFile(finalPath, 'utf-8');
    const updatedContent = replaceExactBlock(originalContent, old_text, new_text);
    await fs.writeFile(finalPath, updatedContent, 'utf-8');
    return `File updated successfully at ${finalPath}`;
  } catch (error) {
    if (error instanceof TextEditOperationError) {
      throw new Error(
        `Could not replace text in '${finalPath}': [${error.code}] ${error.message} ` +
        'Read the file again and retry with a more specific old_text, or switch to edit_file.'
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not replace text in '${finalPath}': ${message}`);
  }
}

const TOOL_NAME = 'replace_in_file';
let cachedTool: BaseTool | null = null;

export function registerReplaceInFileTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.FILE_SYSTEM
    })(replaceInFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}

export { TextEditOperationError };
