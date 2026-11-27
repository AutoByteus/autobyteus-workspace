import { BaseTool, type ToolExecutionOptions } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { registerToolClass } from "autobyteus-ts/tools/tool-meta.js";
import { toToolResultJson } from "autobyteus-ts/tools/tool-result-json.js";
import { SANDBOX_TOOL_MANIFESTS, sandboxToolError } from "./sandbox-tool-manifest.js";

type SandboxToolManifest = (typeof SANDBOX_TOOL_MANIFESTS)[number];
const [CREATE, RUN_IN, DESTROY] = SANDBOX_TOOL_MANIFESTS;

/** One sandbox tool as a native tool; the asking run is the agent that runs it. Arguments are checked before it runs. */
abstract class SandboxNativeTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.SYSTEM;
  protected abstract readonly manifest: SandboxToolManifest;

  async prepareExecution(context: unknown, args: Record<string, unknown> = {}, options: ToolExecutionOptions = {}) {
    try { this.manifest.parse(args); }
    catch (error) { throw new Error(toToolResultJson(sandboxToolError(error))); }
    return super.prepareExecution(context, args, options);
  }

  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    try { return toToolResultJson(await this.manifest.execute(args, this.agentId)); }
    catch (error) { throw new Error(toToolResultJson(sandboxToolError(error))); }
  }
}

export class CreateSandboxTool extends SandboxNativeTool {
  static getName() { return CREATE.name; }
  static getDescription() { return CREATE.description; }
  static getArgumentSchema() { return CREATE.parameterSchema; }
  protected readonly manifest = CREATE;
}

export class RunInSandboxTool extends SandboxNativeTool {
  static getName() { return RUN_IN.name; }
  static getDescription() { return RUN_IN.description; }
  static getArgumentSchema() { return RUN_IN.parameterSchema; }
  protected readonly manifest = RUN_IN;
}

export class DestroySandboxTool extends SandboxNativeTool {
  static getName() { return DESTROY.name; }
  static getDescription() { return DESTROY.description; }
  static getArgumentSchema() { return DESTROY.parameterSchema; }
  protected readonly manifest = DESTROY;
}

/** The opt-in sandbox tools in the tool registry: an agent gets them only when its definition lists them (DEC-107). */
export function registerSandboxTools(): void {
  registerToolClass(CreateSandboxTool);
  registerToolClass(RunInSandboxTool);
  registerToolClass(DestroySandboxTool);
}
