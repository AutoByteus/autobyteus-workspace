import {
  CapturePreviewScreenshotInput,
  CapturePreviewScreenshotResult,
  ClosePreviewInput,
  ClosePreviewResult,
  ExecutePreviewJavascriptInput,
  ExecutePreviewJavascriptResult,
  ListPreviewSessionsInput,
  ListPreviewSessionsResult,
  NavigatePreviewInput,
  NavigatePreviewResult,
  OpenPreviewInput,
  OpenPreviewResult,
  PreviewDomSnapshotInput,
  PreviewDomSnapshotResult,
  ReadPreviewPageInput,
  ReadPreviewPageResult,
  PreviewToolError,
} from "./preview-tool-contract.js";
import {
  assertCapturePreviewScreenshotSemantics,
  assertClosePreviewSemantics,
  assertExecutePreviewJavascriptSemantics,
  assertListPreviewSessionsSemantics,
  assertNavigatePreviewSemantics,
  assertOpenPreviewSemantics,
  assertPreviewDomSnapshotSemantics,
  assertReadPreviewPageSemantics,
} from "./preview-tool-input-normalizers.js";
import { PreviewBridgeClient } from "./preview-bridge-client.js";

export class PreviewToolService {
  isPreviewSupported(env: NodeJS.ProcessEnv = process.env): boolean {
    return PreviewBridgeClient.fromEnvironment(env) !== null;
  }

  async openPreview(input: OpenPreviewInput): Promise<OpenPreviewResult> {
    this.assertPreviewSupported();
    assertOpenPreviewSemantics(input);
    return this.getBridgeClient().openPreview(input);
  }

  async navigatePreview(input: NavigatePreviewInput): Promise<NavigatePreviewResult> {
    this.assertPreviewSupported();
    assertNavigatePreviewSemantics(input);
    return this.getBridgeClient().navigatePreview(input);
  }

  async capturePreviewScreenshot(
    input: CapturePreviewScreenshotInput,
  ): Promise<CapturePreviewScreenshotResult> {
    this.assertPreviewSupported();
    assertCapturePreviewScreenshotSemantics(input);
    return this.getBridgeClient().capturePreviewScreenshot(input);
  }

  async listPreviewSessions(
    input: ListPreviewSessionsInput = {},
  ): Promise<ListPreviewSessionsResult> {
    this.assertPreviewSupported();
    assertListPreviewSessionsSemantics(input);
    return this.getBridgeClient().listPreviewSessions(input);
  }

  async readPreviewPage(
    input: ReadPreviewPageInput,
  ): Promise<ReadPreviewPageResult> {
    this.assertPreviewSupported();
    assertReadPreviewPageSemantics(input);
    return this.getBridgeClient().readPreviewPage(input);
  }

  async executePreviewJavascript(
    input: ExecutePreviewJavascriptInput,
  ): Promise<ExecutePreviewJavascriptResult> {
    this.assertPreviewSupported();
    assertExecutePreviewJavascriptSemantics(input);
    return this.getBridgeClient().executePreviewJavascript(input);
  }

  async previewDomSnapshot(
    input: PreviewDomSnapshotInput,
  ): Promise<PreviewDomSnapshotResult> {
    this.assertPreviewSupported();
    assertPreviewDomSnapshotSemantics(input);
    return this.getBridgeClient().previewDomSnapshot(input);
  }

  async closePreview(input: ClosePreviewInput): Promise<ClosePreviewResult> {
    this.assertPreviewSupported();
    assertClosePreviewSemantics(input);
    return this.getBridgeClient().closePreview(input);
  }

  private assertPreviewSupported(): void {
    if (!this.isPreviewSupported()) {
      throw new PreviewToolError(
        "preview_unsupported_in_current_environment",
        "Preview tools are unavailable because the local Electron preview bridge is not configured.",
      );
    }
  }

  private getBridgeClient(): PreviewBridgeClient {
    const client = PreviewBridgeClient.fromEnvironment();
    if (!client) {
      throw new PreviewToolError(
        "preview_bridge_unavailable",
        "Preview bridge environment variables are missing or incomplete.",
      );
    }
    return client;
  }
}

let cachedPreviewToolService: PreviewToolService | null = null;

export const getPreviewToolService = (): PreviewToolService => {
  if (!cachedPreviewToolService) {
    cachedPreviewToolService = new PreviewToolService();
  }
  return cachedPreviewToolService;
};
