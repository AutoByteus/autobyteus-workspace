import { registerCapturePreviewScreenshotTool } from "./capture-preview-screenshot.js";
import { registerClosePreviewTool } from "./close-preview.js";
import { registerExecutePreviewJavascriptTool } from "./execute-preview-javascript.js";
import { registerListPreviewSessionsTool } from "./list-preview-sessions.js";
import { registerNavigatePreviewTool } from "./navigate-preview.js";
import { registerOpenPreviewTool } from "./open-preview.js";
import { registerPreviewDomSnapshotTool } from "./preview-dom-snapshot.js";
import { getPreviewToolService } from "./preview-tool-service.js";
import { registerReadPreviewPageTool } from "./read-preview-page.js";

export function registerPreviewTools(): void {
  if (!getPreviewToolService().isPreviewSupported()) {
    return;
  }
  registerOpenPreviewTool();
  registerNavigatePreviewTool();
  registerClosePreviewTool();
  registerListPreviewSessionsTool();
  registerReadPreviewPageTool();
  registerCapturePreviewScreenshotTool();
  registerPreviewDomSnapshotTool();
  registerExecutePreviewJavascriptTool();
}
