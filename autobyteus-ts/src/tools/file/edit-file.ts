import fs from 'fs/promises';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { applyContextPatch, PatchApplicationError } from './context-patch.js';
import { addFileToolPathParameters } from './file-tool-schema.js';
import { resolveFileToolPath } from './workspace-path-utils.js';
import {
  EDIT_FILE_DESCRIPTION,
  EDIT_FILE_PATCH_FIELD_GUIDANCE
} from './edit-file-contract.js';
import { formatEditFilePatchFailure } from './edit-file-patch-diagnostic.js';

const argumentSchema = new ParameterSchema();
addFileToolPathParameters(argumentSchema);
argumentSchema.addParameter(new ParameterDefinition({
  name: 'patch',
  type: ParameterType.STRING,
  description: EDIT_FILE_PATCH_FIELD_GUIDANCE,
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
      if (!patchError) {
        throw new Error('Context patch retry loop ended without a result or failure.');
      }
      throw new PatchApplicationError(patchError.failure, formatEditFilePatchFailure);
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
      description: EDIT_FILE_DESCRIPTION,
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
