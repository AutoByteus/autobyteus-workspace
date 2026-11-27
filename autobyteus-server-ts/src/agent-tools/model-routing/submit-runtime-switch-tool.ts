import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import {
  SUBMIT_RUNTIME_SWITCH_TOOL_DESCRIPTION,
  SUBMIT_RUNTIME_SWITCH_TOOL_NAME,
  buildSubmitRuntimeSwitchParameterSchema,
  submitRuntimeSwitch,
} from "./submit-runtime-switch-contract.js";

const OWNER = "server-owned-model-routing";

type CallerContext = Readonly<{ agentId?: string; customData?: Record<string, unknown> | null }>;

const callerRunId = (context: CallerContext | undefined): string | null => {
  const member = context?.customData?.member_run_id;
  return typeof member === "string" && member.trim() ? member.trim() : context?.agentId?.trim() || null;
};

/** `submit_runtime_switch` (C-7) on the AutoByteus runtime; the Model Router agent's definition lists it once approved (R-6). */
export class AutoByteusSubmitRuntimeSwitchTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.SYSTEM;

  static getName() { return SUBMIT_RUNTIME_SWITCH_TOOL_NAME; }
  static getDescription() { return SUBMIT_RUNTIME_SWITCH_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildSubmitRuntimeSwitchParameterSchema(); }

  protected async _execute(context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    const result = await submitRuntimeSwitch(callerRunId(context as CallerContext), args);
    if (result.isError) throw new Error(result.text);
    return result.text;
  }
}

export const ensureSubmitRuntimeSwitchToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(SUBMIT_RUNTIME_SWITCH_TOOL_NAME);
  if (existing?.metadata?.owner === OWNER) return existing;
  const definition = new ToolDefinition(
    SUBMIT_RUNTIME_SWITCH_TOOL_NAME,
    SUBMIT_RUNTIME_SWITCH_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.SYSTEM,
    buildSubmitRuntimeSwitchParameterSchema,
    () => null,
    { toolClass: AutoByteusSubmitRuntimeSwitchTool, metadata: { owner: OWNER } },
  );
  defaultToolRegistry.registerTool(definition);
  return definition;
};
