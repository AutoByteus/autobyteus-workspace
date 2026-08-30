import type { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import {
  BaseTool,
  type ToolExecutionOptions,
  type ToolExecutionPreparation,
  type ToolResultExecutionMode,
} from "autobyteus-ts/tools/base-tool.js";
import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import type { ApplicationAgentToolResult } from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentToolRoute } from "../../../../application-agent-tools/domain/application-agent-tool-route.js";
import type { ApplicationAgentToolCapability } from "../../../../application-agent-tools/services/application-agent-tool-capability.js";

const normalizeApplicationAgentToolResultMode = (
  mode: ToolResultExecutionMode,
  toolName: string,
): ToolResultExecutionMode => {
  if (mode === "in_process" || mode === "external_result") return mode;
  throw new Error(`Invalid tool result execution mode for tool '${toolName}': ${String(mode)}`);
};

export class ApplicationAgentTool extends BaseTool<
  AgentContext,
  Record<string, unknown>,
  ApplicationAgentToolResult
> {
  constructor(
    private readonly route: ApplicationAgentToolRoute,
    private readonly capability: ApplicationAgentToolCapability,
    private readonly argumentSchema: ParameterSchema,
  ) {
    super();
  }

  public override getName(): string {
    return this.route.declarationSnapshot.declaration.name;
  }

  public getDescription(): string {
    return this.route.declarationSnapshot.declaration.description;
  }

  public override getArgumentSchema(): ParameterSchema {
    return this.argumentSchema;
  }

  public override async prepareExecution(
    context: AgentContext,
    args: Record<string, unknown> = {},
    options: ToolExecutionOptions = {},
  ): Promise<ToolExecutionPreparation<Record<string, unknown>>> {
    const toolName = this.getName();
    if (this.agentId === null && typeof context?.agentId === "string") {
      this.setAgentId(context.agentId);
    }
    if (options.signal?.aborted) {
      throw new Error(`Tool '${toolName}' execution aborted before start.`);
    }
    const resultExecutionMode = normalizeApplicationAgentToolResultMode(
      await this.getToolResultExecutionMode(context, args, options),
      toolName,
    );
    return { toolName, args, resultExecutionMode };
  }

  protected override _execute(
    _context: AgentContext,
    args: Record<string, unknown> = {},
    _options: ToolExecutionOptions = {},
  ): Promise<ApplicationAgentToolResult> {
    return this.capability.invoke({ route: this.route, arguments: args });
  }
}
