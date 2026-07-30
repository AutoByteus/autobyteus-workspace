import fs from 'fs/promises';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { addFileToolPathParameters } from './file-tool-schema.js';
import { resolveFileToolPath } from './workspace-path-utils.js';
import { insertRelativeToAnchor, TextEditOperationError } from './text-edit-utils.js';

const DESCRIPTION =
  'Inserts new text before or after one exact anchor block in a file without rewriting the rest. File paths use trusted-local semantics: absolute paths are used directly; relative paths require an explicit absolute base_dir and are never resolved from workspace, process, or shell cd state. Provide exactly one of before_text or after_text, copying the anchor exactly from the file including whitespace and newlines. Use this after read_file when you need to insert a new block near existing text. If the anchor is not unique, use a more specific anchor or switch to edit_file.';

const argumentSchema = new ParameterSchema();
addFileToolPathParameters(argumentSchema);
argumentSchema.addParameter(new ParameterDefinition({
  name: 'new_text',
  type: ParameterType.STRING,
  description:
    'The text to insert. Match the file style exactly, including indentation and line endings.',
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'before_text',
  type: ParameterType.STRING,
  description:
    'Optional exact anchor block. When provided, insert new_text immediately before this exact text.',
  required: false
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'after_text',
  type: ParameterType.STRING,
  description:
    'Optional exact anchor block. When provided, insert new_text immediately after this exact text.',
  required: false
}));

type AgentContextLike = { agentId: string; workspaceRootPath?: string | null };

export async function insertInFile(
  context: AgentContextLike,
  path: string,
  baseDir: string | null | undefined,
  new_text: string,
  before_text?: string,
  after_text?: string
): Promise<string> {
  const finalPath = resolveFileToolPath(context, path, baseDir);

  try {
    await fs.access(finalPath);
  } catch {
    throw new Error(`The file at resolved path ${finalPath} does not exist.`);
  }

  if ((before_text ? 1 : 0) + (after_text ? 1 : 0) !== 1) {
    throw new Error(
      `Could not insert text in '${finalPath}': [invalid_anchor_selection] ` +
      'Provide exactly one of before_text or after_text.'
    );
  }

  try {
    const originalContent = await fs.readFile(finalPath, 'utf-8');
    const updatedContent = before_text
      ? insertRelativeToAnchor(originalContent, before_text, new_text, 'before')
      : insertRelativeToAnchor(originalContent, after_text!, new_text, 'after');
    await fs.writeFile(finalPath, updatedContent, 'utf-8');
    return `Text inserted successfully at ${finalPath}`;
  } catch (error) {
    if (error instanceof TextEditOperationError) {
      throw new Error(
        `Could not insert text in '${finalPath}': [${error.code}] ${error.message} ` +
        'Read the file again and retry with a more specific anchor, or switch to edit_file.'
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not insert text in '${finalPath}': ${message}`);
  }
}

const TOOL_NAME = 'insert_in_file';
let cachedTool: BaseTool | null = null;

export function registerInsertInFileTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.FILE_SYSTEM,
      paramNames: ['context', 'path', 'base_dir', 'new_text', 'before_text', 'after_text']
    })(insertInFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
