import { SegmentType } from '../segments/segment-events.js';

export type ToolArgsBuilder = (metadata: Record<string, any>, content: string) => Record<string, any> | null;

export class ToolSyntaxSpec {
  toolName: string;
  buildArguments: ToolArgsBuilder;

  constructor(toolName: string, buildArguments: ToolArgsBuilder) {
    this.toolName = toolName;
    this.buildArguments = buildArguments;
  }
}

const buildWriteFileArgs: ToolArgsBuilder = (metadata, content) => {
  const path = metadata.path;
  if (!path) {
    return null;
  }
  return { path, content };
};

const buildRunBashArgs: ToolArgsBuilder = (metadata, content) => {
  const command = content || metadata.command || metadata.cmd || '';
  if (!command) {
    return null;
  }

  const args: Record<string, any> = { command };
  if (metadata.background !== undefined) {
    args.background = metadata.background;
  }
  const timeoutSeconds = metadata.timeout_seconds ?? metadata.timeoutSeconds;
  if (timeoutSeconds !== undefined) {
    args.timeout_seconds = timeoutSeconds;
  }
  return args;
};

const buildEditFileArgs: ToolArgsBuilder = (metadata, content) => {
  const path = metadata.path;
  if (!path) {
    return null;
  }
  return { path, patch: content };
};

const TOOL_SYNTAX_REGISTRY = new Map<SegmentType, ToolSyntaxSpec>([
  [SegmentType.WRITE_FILE, new ToolSyntaxSpec('write_file', buildWriteFileArgs)],
  [SegmentType.RUN_BASH, new ToolSyntaxSpec('run_bash', buildRunBashArgs)],
  [SegmentType.EDIT_FILE, new ToolSyntaxSpec('edit_file', buildEditFileArgs)]
]);

export const getToolSyntaxSpec = (segmentType: SegmentType): ToolSyntaxSpec | undefined => {
  return TOOL_SYNTAX_REGISTRY.get(segmentType);
};

export const toolSyntaxRegistryItems = (): Array<[SegmentType, ToolSyntaxSpec]> => {
  return Array.from(TOOL_SYNTAX_REGISTRY.entries());
};
