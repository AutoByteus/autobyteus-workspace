import fs from 'fs/promises';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { applyContextPatch, PatchApplicationError } from './context-patch.js';
import { addFileToolPathParameters } from './file-tool-schema.js';
import { resolveFileToolPath } from './workspace-path-utils.js';

const DESCRIPTION =
  'Applies a context-located patch to one file without overwriting unrelated content. File paths use trusted-local semantics: absolute paths are used directly; relative paths require an explicit absolute base_dir and are never resolved from workspace, process, or shell cd state. Use this for surgical edits; use write_file only for a deliberate whole-file rewrite.';

const argumentSchema = new ParameterSchema();
addFileToolPathParameters(argumentSchema);
argumentSchema.addParameter(new ParameterDefinition({
  name: 'patch',
  type: ParameterType.STRING,
  description:
    'A context-located patch. Start every hunk with a bare @@ line. Prefix unchanged context with one space, removals with -, and additions with +. Do not include line numbers, file headers, or Begin/End Patch metadata. Include enough unchanged/removal lines to identify exactly one location.',
  required: true
}));

type AgentContextLike = { agentId: string; workspaceRootPath?: string | null };

export async function editFile(
  context: AgentContextLike,
  path: string,
  baseDir: string | null | undefined,
  patch: string
): Promise<string> {
  const finalPath = resolveFileToolPath(context, path, baseDir);

  try {
    await fs.access(finalPath);
  } catch {
    throw new Error(`The file at resolved path ${finalPath} does not exist.`);
  }

  try {
    const originalContent = await fs.readFile(finalPath, 'utf-8');

    let patchedContent: string | null = null;
    let patchError: PatchApplicationError | null = null;
    const retryStrategies = [false, true];

    for (const ignoreWhitespace of retryStrategies) {
      try {
        patchedContent = applyContextPatch(originalContent, patch, { ignoreWhitespace });
        break;
      } catch (error) {
        if (error instanceof PatchApplicationError) {
          patchError = error;
          continue;
        }
        throw error;
      }
    }

    if (patchedContent === null) {
      const patchFailure = patchError ?? new PatchApplicationError('Patch could not be applied.');
      throw new PatchApplicationError(
        `${patchFailure.message} Read the file again and retry with a canonical bare @@ patch and more unique unchanged/removal context.`
      );
    }

    await fs.writeFile(finalPath, patchedContent, 'utf-8');
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
      category: ToolCategory.FILE_SYSTEM,
      paramNames: ['context', 'path', 'base_dir', 'patch']
    })(editFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}

export { PatchApplicationError };
