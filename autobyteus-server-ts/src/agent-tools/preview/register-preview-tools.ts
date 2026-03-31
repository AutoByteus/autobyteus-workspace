import { registerCapturePreviewScreenshotTool } from "./capture-preview-screenshot.js";
import { registerClosePreviewTool } from "./close-preview.js";
import { registerGetPreviewConsoleLogsTool } from "./get-preview-console-logs.js";
import { registerNavigatePreviewTool } from "./navigate-preview.js";
import { registerOpenPreviewTool } from "./open-preview.js";
import { getPreviewToolService } from "./preview-tool-service.js";

export function registerPreviewTools(): void {
  if (!getPreviewToolService().isPreviewSupported()) {
    return;
  }
  registerOpenPreviewTool();
  registerNavigatePreviewTool();
  registerCapturePreviewScreenshotTool();
  registerGetPreviewConsoleLogsTool();
  registerClosePreviewTool();
}
