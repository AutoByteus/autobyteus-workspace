import { registerScreenshotTool } from "./screenshot.js";
import { registerCloseTabTool } from "./close-tab.js";
import { registerRunScriptTool } from "./run-script.js";
import { registerListTabsTool } from "./list-tabs.js";
import { registerNavigateToTool } from "./navigate-to.js";
import { registerOpenTabTool } from "./open-tab.js";
import { registerDomSnapshotTool } from "./dom-snapshot.js";
import { getBrowserToolService } from "./browser-tool-service.js";
import { registerReadPageTool } from "./read-page.js";

export function registerBrowserTools(): void {
  if (!getBrowserToolService().isBrowserSupported()) {
    return;
  }
  registerOpenTabTool();
  registerNavigateToTool();
  registerCloseTabTool();
  registerListTabsTool();
  registerReadPageTool();
  registerScreenshotTool();
  registerDomSnapshotTool();
  registerRunScriptTool();
}
