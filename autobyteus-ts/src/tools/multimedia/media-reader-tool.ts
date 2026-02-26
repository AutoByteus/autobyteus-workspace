import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { ContextFile } from '../../agent/message/context-file.js';

type WorkspaceLike = { getBasePath?: () => string };
type AgentContextLike = { agentId?: string; workspace?: WorkspaceLike | null };

type ReadMediaArgs = {
  file_path: string;
};

function resolveWorkspaceRoot(workspace: WorkspaceLike | null | undefined): string | null {
  if (!workspace) return null;
  if (typeof workspace.getBasePath === 'function') {
    return path.resolve(workspace.getBasePath());
  }
  return null;
}

function isWithinRoot(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export class ReadMediaFile extends BaseTool {
  static CATEGORY = ToolCategory.MULTIMEDIA;

  static getName(): string {
    return 'read_media_file';
  }

  static getDescription(): string {
    return (
      'Loads a media file (image, audio, video) into the context for the next turn, ' +
      "allowing the LLM to directly analyze its content. Use this when you need to 'see' an image, " +
      "'listen' to audio, or 'watch' a video that you know exists in the workspace or file system."
    );
  }

  static getArgumentSchema(): ParameterSchema {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'file_path',
      type: ParameterType.STRING,
      description: 'The absolute path or workspace-relative path to the media file.',
      required: true
    }));
    return schema;
  }

  protected async _execute(context: AgentContextLike, kwargs?: ReadMediaArgs): Promise<ContextFile> {
    const filePath = kwargs?.file_path;
    if (!filePath || typeof filePath !== 'string') {
      throw new Error("'file_path' is required and must be a string.");
    }

    const workspaceRoot = resolveWorkspaceRoot(context?.workspace ?? null);
    let absolutePath: string;

    if (path.isAbsolute(filePath)) {
      absolutePath = path.normalize(filePath);

      if (workspaceRoot && !isWithinRoot(workspaceRoot, absolutePath)) {
        console.warn(
          `Security Note: Tool '${ReadMediaFile.getName()}' is accessing an absolute path ` +
            `'${absolutePath}' which is outside the agent's workspace '${workspaceRoot}'.`
        );
      }
    } else {
      if (!workspaceRoot) {
        throw new Error(
          `A relative path '${filePath}' was provided, but the agent's workspace does not support ` +
            'file system path resolution. Please provide an absolute path or configure a suitable workspace.'
        );
      }

      const resolved = path.resolve(workspaceRoot, filePath);
      if (!isWithinRoot(workspaceRoot, resolved)) {
        throw new Error(
          `Security error: Path '${filePath}' attempts to access files outside the agent's workspace.`
        );
      }
      absolutePath = resolved;
    }

    let stat;
    try {
      stat = await fs.stat(absolutePath);
    } catch {
      throw new Error(
        `The file '${filePath}' does not exist or is not a regular file at the resolved path '${absolutePath}'.`
      );
    }

    if (!stat.isFile()) {
      throw new Error(
        `The file '${filePath}' does not exist or is not a regular file at the resolved path '${absolutePath}'.`
      );
    }

    return new ContextFile(absolutePath);
  }
}
