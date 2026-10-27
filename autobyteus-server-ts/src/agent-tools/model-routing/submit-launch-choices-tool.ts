import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { ToolOrigin } from "autobyteus-ts/tools/tool-origin.js";
import {
  SUBMIT_LAUNCH_CHOICES_TOOL_DESCRIPTION,
  SUBMIT_LAUNCH_CHOICES_TOOL_NAME,
  buildSubmitLaunchChoicesParameterSchema,
  submitLaunchChoices,
} from "./submit-launch-choices-contract.js";

const OWNER = "server-owned-model-routing";

type CallerContext = Readonly<{ agentId?: string; customData?: Record<string, unknown> | null }>;

const callerRunId = (context: CallerContext | undefined): string | null => {
  const member = context?.customData?.member_run_id;
  return typeof member === "string" && member.trim() ? member.trim() : context?.agentId?.trim() || null;
};

/** `submit_launch_choices` on the AutoByteus runtime; the Model Router agent's definition lists it. */
export class AutoByteusSubmitLaunchChoicesTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.SYSTEM;

  static getName() { return SUBMIT_LAUNCH_CHOICES_TOOL_NAME; }
  static getDescription() { return SUBMIT_LAUNCH_CHOICES_TOOL_DESCRIPTION; }
  static getArgumentSchema() { return buildSubmitLaunchChoicesParameterSchema(); }

  protected async _execute(context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    const result = await submitLaunchChoices(callerRunId(context as CallerContext), args);
    if (result.isError) throw new Error(result.text);
    return result.text;
  }
}

export const ensureSubmitLaunchChoicesToolRegistered = (): ToolDefinition => {
  const existing = defaultToolRegistry.getToolDefinition(SUBMIT_LAUNCH_CHOICES_TOOL_NAME);
  if (existing?.metadata?.owner === OWNER) return existing;
  const definition = new ToolDefinition(
    SUBMIT_LAUNCH_CHOICES_TOOL_NAME,
    SUBMIT_LAUNCH_CHOICES_TOOL_DESCRIPTION,
    ToolOrigin.LOCAL,
    ToolCategory.SYSTEM,
    buildSubmitLaunchChoicesParameterSchema,
    () => null,
    { toolClass: AutoByteusSubmitLaunchChoicesTool, metadata: { owner: OWNER } },
  );
  defaultToolRegistry.registerTool(definition);
  return definition;
};
