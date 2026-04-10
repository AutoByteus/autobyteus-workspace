import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { registerScreenshotTool } from "./screenshot.js";
import { registerCloseTabTool } from "./close-tab.js";
import { registerRunScriptTool } from "./run-script.js";
import { registerListTabsTool } from "./list-tabs.js";
import { registerNavigateToTool } from "./navigate-to.js";
import { registerOpenTabTool } from "./open-tab.js";
import { registerDomSnapshotTool } from "./dom-snapshot.js";
import { getBrowserToolService } from "./browser-tool-service.js";
import { registerReadPageTool } from "./read-page.js";
import { BROWSER_TOOL_NAME_LIST } from "./browser-tool-contract.js";

export function registerBrowserTools(): void {
  if (!getBrowserToolService().isBrowserSupported()) {
    return;
  }
  registerAllBrowserTools();
}

export function registerAllBrowserTools(): void {
  registerOpenTabTool();
  registerNavigateToTool();
  registerCloseTabTool();
  registerListTabsTool();
  registerReadPageTool();
  registerScreenshotTool();
  registerDomSnapshotTool();
  registerRunScriptTool();
}

export function unregisterBrowserTools(): void {
  for (const toolName of BROWSER_TOOL_NAME_LIST) {
    defaultToolRegistry.unregisterTool(toolName);
  }
}
