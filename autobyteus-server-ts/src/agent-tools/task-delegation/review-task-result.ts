import { BaseTool } from "autobyteus-ts/tools/base-tool.js";
import type { ToolConfig } from "autobyteus-ts/tools/tool-config.js";
import { ToolCategory } from "autobyteus-ts/tools/tool-category.js";
import { registerToolClass } from "autobyteus-ts/tools/tool-meta.js";
import {
  requireConfiguredTaskDelegationToolContext,
  REVIEW_TASK_RESULT_TOOL_NAME,
  type TaskDelegationToolContext,
} from "./task-delegation-tool-contract.js";
import { getTaskDelegationToolManifestEntry } from "./task-delegation-tool-manifest.js";
import { buildReviewTaskResultParameterSchema } from "./task-delegation-tool-parameter-schemas.js";
import {
  toTaskDelegationJsonString,
  toTaskDelegationToolErrorPayload,
} from "./task-delegation-tool-serialization.js";
import { getTaskDelegationToolService } from "./task-delegation-tool-service.js";

export class ReviewTaskResultTool extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;
  private readonly taskDelegationContext: TaskDelegationToolContext;

  constructor(config?: ToolConfig) {
    super(config);
    this.taskDelegationContext = requireConfiguredTaskDelegationToolContext(config);
  }

  static getName(): string {
    return REVIEW_TASK_RESULT_TOOL_NAME;
  }

  static getDescription(): string {
    return getTaskDelegationToolManifestEntry(REVIEW_TASK_RESULT_TOOL_NAME).description;
  }

  static getArgumentSchema() {
    return buildReviewTaskResultParameterSchema();
  }

  protected async _execute(
    _context: unknown,
    kwargs: Record<string, unknown> = {},
  ): Promise<string> {
    try {
      const entry = getTaskDelegationToolManifestEntry(REVIEW_TASK_RESULT_TOOL_NAME);
      const result = await entry.execute(
        getTaskDelegationToolService(),
        this.taskDelegationContext,
        entry.parseInput(kwargs),
      );
      return toTaskDelegationJsonString(result);
    } catch (error) {
      throw new Error(toTaskDelegationJsonString(toTaskDelegationToolErrorPayload(error)));
    }
  }
}

export function registerReviewTaskResultTool(): void {
  registerToolClass(ReviewTaskResultTool);
}
