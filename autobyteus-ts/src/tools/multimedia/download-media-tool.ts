import axios from 'axios';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import mime from 'mime-types';
import { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { getDefaultDownloadFolder } from '../../utils/file-utils.js';

type WorkspaceLike = { getBasePath?: () => string };
type AgentContextLike = { agentId?: string; workspace?: WorkspaceLike | null };

type DownloadMediaArgs = {
  url: string;
  filename: string;
  folder?: string;
};

function resolveWorkspaceBasePath(workspace: WorkspaceLike | null | undefined): string | null {
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

export class DownloadMediaTool extends BaseTool {
  static CATEGORY = ToolCategory.MULTIMEDIA;

  static getName(): string {
    return 'download_media';
  }

  static getDescription(): string {
    return (
      'Download a media file (image/PDF/audio/etc.) from a direct URL and save it locally. ' +
      'The tool picks the correct file extension from the HTTP Content-Type header (or falls back to the URL). ' +
      'Files are saved to the agent workspace if you give a relative folder (preferred), or to your default ' +
      'Downloads directory when no folder is provided. Returns the absolute path of the saved file.'
    );
  }

  static getArgumentSchema(): ParameterSchema {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'url',
      type: ParameterType.STRING,
      description: 'The direct URL of the media file to download.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'filename',
      type: ParameterType.STRING,
      description:
        "The desired base name for the downloaded file (e.g., 'vacation_photo', 'annual_report'). The tool will automatically add the correct file extension.",
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'folder',
      type: ParameterType.STRING,
      description: 'Optional. A custom directory path to save the file. If not provided, the system\'s default download folder will be used.',
      required: false
    }));
    return schema;
  }

  protected async _execute(context: AgentContextLike, kwargs?: DownloadMediaArgs): Promise<string> {
    const { url, filename, folder } = kwargs ?? ({} as DownloadMediaArgs);

    let destinationDir: string;
    try {
      if (folder) {
        if (folder.includes('..')) {
          throw new Error("Security error: 'folder' path cannot contain '..'.");
        }
        if (!path.isAbsolute(folder)) {
          const workspaceRoot = resolveWorkspaceBasePath(context?.workspace ?? null);
          if (workspaceRoot) {
            const resolved = path.resolve(workspaceRoot, folder);
            if (!isWithinRoot(workspaceRoot, resolved)) {
              throw new Error(`Security error: 'folder' resolves outside workspace: ${resolved}`);
            }
            destinationDir = resolved;
          } else {
            destinationDir = path.resolve(getDefaultDownloadFolder(), folder);
          }
        } else {
          destinationDir = path.resolve(folder);
        }
      } else {
        destinationDir = path.resolve(getDefaultDownloadFolder());
      }

      await fsPromises.mkdir(destinationDir, { recursive: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create or access download directory: ${message}`);
    }

    if (!filename || filename.includes('..') || path.isAbsolute(filename) || filename.includes('/') || filename.includes('\\')) {
      throw new Error("Invalid filename. It must be a simple name without any path characters ('..', '/', '\\').");
    }

    try {
      const response = await axios.get(url, {
        timeout: 60000,
        responseType: 'stream'
      });

      const contentType = response.headers?.['content-type'];
      let correctExt = '';
      if (contentType) {
        const mimeType = contentType.split(';')[0].trim();
        const ext = mime.extension(mimeType);
        if (ext && ext !== 'bin') {
          correctExt = ext.startsWith('.') ? ext : `.${ext}`;
        }
      }

      if (!correctExt) {
        let urlPath = '';
        try {
          urlPath = new URL(url).pathname;
        } catch {
          urlPath = url;
        }
        const extFromUrl = path.extname(path.basename(urlPath));
        if (extFromUrl && extFromUrl.length > 1) {
          correctExt = extFromUrl;
        }
      }

      const baseFilename = path.parse(filename).name;
      let finalFilename = `${baseFilename}${correctExt}`;
      let savePath = path.join(destinationDir, finalFilename);

      let counter = 1;
      while (fs.existsSync(savePath)) {
        finalFilename = `${baseFilename}_${counter}${correctExt}`;
        savePath = path.join(destinationDir, finalFilename);
        counter += 1;
      }

      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(savePath);
        response.data.pipe(writeStream);
        response.data.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
      });

      return `Successfully downloaded file to: ${savePath}`;
    } catch (error) {
      throw new Error(`Failed to download from ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
