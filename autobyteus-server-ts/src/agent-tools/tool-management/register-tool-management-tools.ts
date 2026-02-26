import { registerListAvailableToolsTool } from "./list-available-tools.js";
import { registerListInputProcessorsTool } from "./list-input-processors.js";
import { registerListLlmResponseProcessorsTool } from "./list-llm-response-processors.js";
import { registerListLifecycleProcessorsTool } from "./list-lifecycle-processors.js";
import { registerListToolResultProcessorsTool } from "./list-tool-result-processors.js";

export function registerToolManagementTools(): void {
  registerListAvailableToolsTool();
  registerListInputProcessorsTool();
  registerListLlmResponseProcessorsTool();
  registerListLifecycleProcessorsTool();
  registerListToolResultProcessorsTool();
}
