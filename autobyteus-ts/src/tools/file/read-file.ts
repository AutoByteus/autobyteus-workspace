import fs from 'fs/promises';
import pathModule from 'path';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';

const DESCRIPTION = [
  'Reads content from a specified file. Supports optional 1-based inclusive line ranges via start_line/end_line.',
  'Each returned line is prefixed with its line number when include_line_numbers is true.',
  "'path' is the path to the file. If relative, it must be resolved against a configured agent workspace.",
  'Raises ValueError if a relative path is given without a valid workspace or if line range arguments are invalid.',
  'Raises FileNotFoundError if the file does not exist.',
  'Raises IOError if file reading fails for other reasons.'
].join(' ');

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(new ParameterDefinition({
  name: 'path',
  type: ParameterType.STRING,
  description: "Parameter 'path' for tool 'read_file'. This is expected to be a path.",
  required: true
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'start_line',
  type: ParameterType.INTEGER,
  description: "Parameter 'start_line' for tool 'read_file'.",
  required: false
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'end_line',
  type: ParameterType.INTEGER,
  description: "Parameter 'end_line' for tool 'read_file'.",
  required: false
}));
argumentSchema.addParameter(new ParameterDefinition({
  name: 'include_line_numbers',
  type: ParameterType.BOOLEAN,
  description: 'If true, prefix each returned line with its line number (default).',
  required: false,
  defaultValue: true
}));

type WorkspaceLike = { getBasePath: () => string };
type AgentContextLike = { agentId: string; workspace?: WorkspaceLike | null };

export async function readFile(
  context: AgentContextLike,
  filePath: string,
  startLine?: number | null,
  endLine?: number | null,
  includeLineNumbers: boolean = true
): Promise<string> {
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

  let finalPath = filePath;
  if (!pathModule.isAbsolute(filePath)) {
    const workspace = context.workspace ?? null;
    if (!workspace) {
      throw new Error(
        `Relative path '${filePath}' provided, but no workspace is configured for agent '${context.agentId}'. A workspace is required to resolve relative paths.`
      );
    }
    const basePath = workspace.getBasePath();
    if (!basePath || typeof basePath !== 'string') {
      throw new Error(
        `Agent '${context.agentId}' has a configured workspace, but it provided an invalid base path ('${basePath}'). Cannot resolve relative path '${filePath}'.`
      );
    }
    finalPath = pathModule.join(basePath, filePath);
  }

  finalPath = pathModule.normalize(finalPath);

  try {
    await fs.access(finalPath);
  } catch {
    throw new Error(`The file at resolved path ${finalPath} does not exist.`);
  }

  try {
    const fileContents = await fs.readFile(finalPath, 'utf-8');
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read file at ${finalPath}: ${message}`);
  }
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
      paramNames: ['context', 'path', 'start_line', 'end_line', 'include_line_numbers']
    })(readFile) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
