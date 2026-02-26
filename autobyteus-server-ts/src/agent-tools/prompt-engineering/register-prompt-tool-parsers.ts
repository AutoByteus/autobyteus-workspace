import { XmlToolParsingStateRegistry } from "autobyteus-ts/agent/streaming/parser/xml-tool-parsing-state-registry.js";
import { XmlCreatePromptToolParsingState } from "./states/xml-create-prompt-tool-parsing-state.js";
import { XmlUpdatePromptToolParsingState } from "./states/xml-update-prompt-tool-parsing-state.js";
import { XmlPatchPromptToolParsingState } from "./states/xml-patch-prompt-tool-parsing-state.js";

export function registerPromptToolParsingStates(): void {
  const registry = new XmlToolParsingStateRegistry();
  registry.registerToolState("create_prompt", XmlCreatePromptToolParsingState);
  registry.registerToolState("update_prompt", XmlUpdatePromptToolParsingState);
  registry.registerToolState("patch_prompt", XmlPatchPromptToolParsingState);
}
