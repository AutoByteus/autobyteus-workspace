import fs from 'fs/promises';
import pathModule from 'path';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { applyUnifiedDiff, PatchApplicationError } from '../../utils/diff-utils.js';

const DESCRIPTION =
  'Applies a unified diff patch to update a text file without overwriting unrelated content.';

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'path',
  type: ParameterType.STRING,
  description: 'Path to the target file.',
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'patch',
  type: ParameterType.STRING,
  description: 'Unified diff hunks describing edits to apply.',
  required: true
}));

type WorkspaceLike = { getBasePath: () => string };
type AgentContextLike = { agentId: string; workspace?: WorkspaceLike | null };

function splitLinesKeepEnds(text: string): string[] {
  const matches = text.match(/.*(?:\n|$)/g) ?? [];
  if (matches.length > 0 && matches[matches.length - 1] === '') {
    matches.pop();
  }
  return matches;
}

function resolveFilePath(context: AgentContextLike, path: string): string {
  if (pathModule.isAbsolute(path)) {
    return pathModule.normalize(path);
  }

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

  return pathModule.normalize(pathModule.join(basePath, path));
}

export async function editFile(
  context: AgentContextLike,
  path: string,
  patch: string
): Promise<string> {
  const returnPath = pathModule.normalize(path);
  const finalPath = resolveFilePath(context, path);

  try {
    await fs.access(finalPath);
  } catch {
    throw new Error(`The file at resolved path ${finalPath} does not exist.`);
  }

  try {
    const originalContent = await fs.readFile(finalPath, 'utf-8');
    const originalLines = splitLinesKeepEnds(originalContent);

    let patchedLines: string[] | null = null;
    let patchError: PatchApplicationError | null = null;
    const retryStrategies: Array<[number, boolean]> = [
      [0, false],
      [1, false],
      [1, true],
      [2, true]
    ];

    for (const [fuzzFactor, ignoreWhitespace] of retryStrategies) {
      try {
        patchedLines = applyUnifiedDiff(originalLines, patch, { fuzzFactor, ignoreWhitespace });
        break;
      } catch (error) {
        if (error instanceof PatchApplicationError) {
          patchError = error;
          continue;
        }
        throw error;
      }
    }

    if (!patchedLines) {
      throw patchError ?? new PatchApplicationError('Patch could not be applied.');
    }

    await fs.writeFile(finalPath, patchedLines.join(''), 'utf-8');
    return `File edited successfully at ${returnPath}`;
  } catch (error) {
    if (error instanceof PatchApplicationError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not edit file at '${finalPath}': ${message}`);
  }
}

const TOOL_NAME = 'edit_file';
let cachedTool: BaseTool | null = null;

export function registerEditFileTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.FILE_SYSTEM
    })(editFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}

export { PatchApplicationError };
