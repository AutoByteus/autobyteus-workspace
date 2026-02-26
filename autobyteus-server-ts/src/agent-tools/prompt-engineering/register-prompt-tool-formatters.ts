import { registerToolFormatter } from "autobyteus-ts";
import {
  CreatePromptXmlSchemaFormatter,
  CreatePromptXmlExampleFormatter,
} from "./formatters/create-prompt-formatters.js";
import {
  PatchPromptXmlSchemaFormatter,
  PatchPromptXmlExampleFormatter,
} from "./formatters/patch-prompt-formatters.js";
import {
  UpdatePromptXmlSchemaFormatter,
  UpdatePromptXmlExampleFormatter,
} from "./formatters/update-prompt-formatters.js";

export function registerPromptToolFormatters(): void {
  registerToolFormatter(
    "create_prompt",
    new CreatePromptXmlSchemaFormatter(),
    new CreatePromptXmlExampleFormatter(),
  );
  registerToolFormatter(
    "patch_prompt",
    new PatchPromptXmlSchemaFormatter(),
    new PatchPromptXmlExampleFormatter(),
  );
  registerToolFormatter(
    "update_prompt",
    new UpdatePromptXmlSchemaFormatter(),
    new UpdatePromptXmlExampleFormatter(),
  );
}
