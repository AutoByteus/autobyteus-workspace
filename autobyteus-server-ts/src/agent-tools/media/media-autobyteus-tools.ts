import { BaseTool } from "autobyteus-ts";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type {
  MediaToolExecutionContext,
  MediaToolName,
  MediaToolResult,
} from "./media-tool-contract.js";
import { MEDIA_TOOL_MANIFEST, type MediaToolManifestEntry } from "./media-tool-manifest.js";
import { getMediaGenerationService } from "./media-generation-service.js";

const TOOL_CATEGORY = "Multimedia";
const MEDIA_TOOL_METADATA_KEY = "server_owned_media_tool";

type ToolContextLike = MediaToolExecutionContext;

class MediaAutobyteusTool extends BaseTool<
  ToolContextLike,
  Record<string, unknown>,
  MediaToolResult
> {
  constructor(
    private readonly entry: MediaToolManifestEntry,
    config?: ToolConfig,
  ) {
    super(config);
  }

  protected override getName(): string {
    return this.entry.name;
  }

  public getDescription(): string {
    return this.entry.getDescription();
  }

  public getArgumentSchema(): ParameterSchema | null {
    return this.entry.buildArgumentSchema();
  }

  public getConfigSchema(): null {
    return null;
  }

  protected async _execute(
    context: ToolContextLike,
    rawArguments: Record<string, unknown> = {},
  ): Promise<MediaToolResult> {
    const input = this.entry.parseInput(rawArguments);
    return this.entry.execute(getMediaGenerationService(), context, input);
  }
}

const cachedTools = new Map<MediaToolName, BaseTool>();

const isRegisteredServerMediaTool = (toolName: MediaToolName): boolean =>
  defaultToolRegistry.getToolDefinition(toolName)?.metadata?.[MEDIA_TOOL_METADATA_KEY] === true;

export const buildMediaToolDefinition = (entry: MediaToolManifestEntry): ToolDefinition =>
  new ToolDefinition(
    entry.name,
    entry.getDescription(),
    ToolOrigin.LOCAL,
    TOOL_CATEGORY,
    () => entry.buildArgumentSchema(),
    () => null,
    {
      customFactory: (config?: ToolConfig) => new MediaAutobyteusTool(entry, config),
      descriptionProvider: entry.getDescription,
      metadata: {
        [MEDIA_TOOL_METADATA_KEY]: true,
      },
    },
  );

export const registerMediaAutobyteusTool = (entry: MediaToolManifestEntry): BaseTool => {
  if (!defaultToolRegistry.getToolDefinition(entry.name)) {
    defaultToolRegistry.registerTool(buildMediaToolDefinition(entry));
  } else if (!isRegisteredServerMediaTool(entry.name)) {
    throw new Error(
      `Cannot register server-owned media tool '${entry.name}' because another owner already registered that tool name.`,
    );
  }

  const cached = cachedTools.get(entry.name);
  if (cached) {
    return cached;
  }

  const tool = defaultToolRegistry.createTool(entry.name) as BaseTool;
  cachedTools.set(entry.name, tool);
  return tool;
};

export const registerMediaAutobyteusTools = (): BaseTool[] =>
  MEDIA_TOOL_MANIFEST.map((entry) => registerMediaAutobyteusTool(entry));

export const clearCachedMediaAutobyteusTools = (): void => {
  cachedTools.clear();
};
