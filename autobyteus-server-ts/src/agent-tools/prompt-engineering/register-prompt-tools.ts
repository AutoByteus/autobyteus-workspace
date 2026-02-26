import { registerActivatePromptTool } from "./activate-prompt.js";
import { registerCreatePromptTool } from "./create-prompt.js";
import { registerDeletePromptTool } from "./delete-prompt.js";
import { registerGetPromptTool } from "./get-prompt.js";
import { registerListPromptsTool } from "./list-prompts.js";
import { registerPatchPromptTool } from "./patch-prompt.js";
import { registerUpdatePromptTool } from "./update-prompt.js";
import { registerUpdatePromptMetadataTool } from "./update-prompt-metadata.js";
import { registerPromptToolFormatters } from "./register-prompt-tool-formatters.js";
import { registerPromptToolParsingStates } from "./register-prompt-tool-parsers.js";

export function registerPromptTools(): void {
  registerCreatePromptTool();
  registerGetPromptTool();
  registerPatchPromptTool();
  registerUpdatePromptTool();
  registerUpdatePromptMetadataTool();
  registerActivatePromptTool();
  registerDeletePromptTool();
  registerListPromptsTool();
  registerPromptToolFormatters();
  registerPromptToolParsingStates();
}
