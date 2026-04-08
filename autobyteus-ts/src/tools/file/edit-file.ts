import fs from 'fs/promises';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { applyUnifiedDiff, PatchApplicationError } from '../../utils/diff-utils.js';
import { resolveAbsolutePath } from './workspace-path-utils.js';

const DESCRIPTION =
  'Applies a diff-style patch to one file without overwriting unrelated content. Provide a git diff or unified diff patch for the target file. Use this for surgical patch edits. If exact text replacement is easier, use replace_in_file. If you only need to insert new text near an exact anchor, use insert_in_file.';

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'path',
  type: ParameterType.STRING,
  description:
    'The filesystem path to the file to patch. This may be absolute or relative to the configured workspace root. It is never resolved from prior shell cd state.',
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'patch',
  type: ParameterType.STRING,
  description:
    'A git diff or unified diff patch for this file. Use numeric hunk headers such as @@ -10,7 +10,8 @@ and match the file style exactly.',
  required: true
}));

type AgentContextLike = { agentId: string; workspaceRootPath?: string | null };

function splitLinesKeepEnds(text: string): string[] {
  const matches = text.match(/.*(?:\n|$)/g) ?? [];
  if (matches.length > 0 && matches[matches.length - 1] === '') {
    matches.pop();
  }
  return matches;
}

export async function editFile(
  context: AgentContextLike,
  path: string,
  patch: string
): Promise<string> {
  const finalPath = resolveAbsolutePath(context, path);

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
      const patchFailure = patchError ?? new PatchApplicationError('Patch could not be applied.');
      throw new PatchApplicationError(
        `${patchFailure.message} Read the file again and retry with a more precise patch, or use replace_in_file / insert_in_file for exact text edits.`
      );
    }

    await fs.writeFile(finalPath, patchedLines.join(''), 'utf-8');
    return `File edited successfully at ${finalPath}`;
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
