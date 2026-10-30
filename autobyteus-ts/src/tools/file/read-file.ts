import fs from 'fs/promises';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { addFileToolPathParameters } from './file-tool-schema.js';
import { resolveFileToolPath } from './workspace-path-utils.js';
import { readMediaFileAsContextFile, type MediaReadContext } from './read-file-media.js';
import type { ContextFile } from '../../agent/message/context-file.js';
import { getMediaFileKindFromPath } from '../../utils/media-file-kind.js';

const DESCRIPTION = [
  'Reads content from a specified file. Supports optional 1-based inclusive line ranges via start_line/end_line.',
  'Each returned line is prefixed with its line number when include_line_numbers is true.',
  'Image, audio and video files (by extension) are attached for the model to see in the next turn instead of being returned as text; line ranges do not apply to them, a kind the current model cannot take is refused, and other binary files are refused.',
  "File paths use trusted-local semantics: absolute paths are used directly; relative paths require an explicit absolute base_dir and are never resolved from workspace, process, or shell cd state.",
  'Raises ValueError if a relative path is given without an absolute base_dir or if line range arguments are invalid.',
  'Raises FileNotFoundError if the file does not exist.',
  'Raises IOError if file reading fails for other reasons.'
].join(' ');

const argumentSchema = new ParameterSchema();
addFileToolPathParameters(argumentSchema);
argumentSchema.addParameter(new ParameterDefinition({
  name: 'start_line',
  type: ParameterType.INTEGER,
  description: 'First line to return (1-based, inclusive). Text files only; omit to start at line 1.',
  required: false
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'end_line',
  type: ParameterType.INTEGER,
  description: 'Last line to return (1-based, inclusive). Text files only; omit to read to the end.',
  required: false
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'include_line_numbers',
  type: ParameterType.BOOLEAN,
  description: 'If true, prefix each returned line with its line number (default).',
  required: false,
  defaultValue: true
}));

type AgentContextLike = { agentId: string; workspaceRootPath?: string | null } & MediaReadContext;

export async function readFile(
  context: AgentContextLike,
  filePath: string,
  baseDir?: string | null,
  startLine?: number | null,
  endLine?: number | null,
  includeLineNumbers: boolean = true
): Promise<string | ContextFile> {
  const finalPath = resolveFileToolPath(context, filePath, baseDir);

  const mediaKind = getMediaFileKindFromPath(finalPath);
  if (mediaKind) {
    const hasLineRange = (startLine !== undefined && startLine !== null) || (endLine !== undefined && endLine !== null);
    if (hasLineRange) {
      throw new Error(
        `start_line and end_line apply to text files only; '${finalPath}' is ${mediaKind === 'video' ? 'a' : 'an'} ${mediaKind} file, ` +
          'so it was not loaded. Call read_file again without start_line and end_line, and do not claim to have inspected the file before it is loaded.'
      );
    }
    return readMediaFileAsContextFile(context, finalPath, mediaKind);
  }

  if (startLine !== undefined && startLine !== null && startLine < 1) {
    throw new Error(`start_line must be >= 1 when provided; got ${startLine}.`);
  }
  if (endLine !== undefined && endLine !== null && endLine < 1) {
    throw new Error(`end_line must be >= 1 when provided; got ${endLine}.`);
  }
  if (
    startLine !== undefined &&
    startLine !== null &&
    endLine !== undefined &&
    endLine !== null &&
    endLine < startLine
  ) {
    throw new Error(`end_line (${endLine}) must be >= start_line (${startLine}).`);
  }

  try {
    await fs.access(finalPath);
  } catch {
    throw new Error(`The file at resolved path ${finalPath} does not exist.`);
  }

  let fileBytes: Buffer;
  try {
    fileBytes = await fs.readFile(finalPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read file at ${finalPath}: ${message}`);
  }
  // A NUL byte anywhere marks a file as binary; text files contain none. The whole buffer is scanned because many
  // PDFs have their first NUL after the first 8,000 bytes (DEC-006).
  if (fileBytes.includes(0)) {
    throw new Error(
      `The file '${finalPath}' is a binary file and cannot be read as text. read_file reads text files and image, audio and video files.`
    );
  }

  const fileContents = fileBytes.toString('utf8');
  const lines = fileContents.match(/.*(?:\n|$)/g) ?? [];
  const selected: string[] = [];
  let lineNo = 0;

  for (const line of lines) {
    if (line === '') {
      continue;
    }
    lineNo += 1;
    if (startLine !== undefined && startLine !== null && lineNo < startLine) {
      continue;
    }
    if (endLine !== undefined && endLine !== null && lineNo > endLine) {
      break;
    }

    if (includeLineNumbers) {
      const hasNewline = line.endsWith('\n');
      const lineText = hasNewline ? line.slice(0, -1) : line;
      selected.push(`${lineNo}: ${lineText}${hasNewline ? '\n' : ''}`);
    } else {
      selected.push(line);
    }
  }

  return selected.join('');
}

const TOOL_NAME = 'read_file';
let cachedTool: BaseTool | null = null;

export function registerReadFileTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: ToolCategory.FILE_SYSTEM,
      paramNames: ['context', 'path', 'base_dir', 'start_line', 'end_line', 'include_line_numbers']
    })(readFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
