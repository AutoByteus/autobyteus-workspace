import {
  ScreenshotInput,
  ScreenshotResult,
  CloseTabInput,
  CloseTabResult,
  RunScriptInput,
  RunScriptResult,
  ListTabsInput,
  ListTabsResult,
  NavigateToInput,
  NavigateToResult,
  OpenTabInput,
  OpenTabResult,
  DomSnapshotInput,
  DomSnapshotResult,
  ReadPageInput,
  ReadPageResult,
  BrowserToolError,
} from "./browser-tool-contract.js";
import {
  assertScreenshotSemantics,
  assertCloseTabSemantics,
  assertRunScriptSemantics,
  assertListTabsSemantics,
  assertNavigateToSemantics,
  assertOpenTabSemantics,
  assertDomSnapshotSemantics,
  assertReadPageSemantics,
} from "./browser-tool-semantic-validators.js";
import { BrowserBridgeClient } from "./browser-bridge-client.js";
import { getBrowserBridgeConfigResolver } from "./browser-bridge-config-resolver.js";

export class BrowserToolService {
  isBrowserSupported(env: NodeJS.ProcessEnv = process.env): boolean {
    return getBrowserBridgeConfigResolver().hasSupport(env);
  }

  async openTab(input: OpenTabInput): Promise<OpenTabResult> {
    this.assertBrowserSupported();
    assertOpenTabSemantics(input);
    return this.getBridgeClient().openTab(input);
  }

  async navigateTo(input: NavigateToInput): Promise<NavigateToResult> {
    this.assertBrowserSupported();
    assertNavigateToSemantics(input);
    return this.getBridgeClient().navigateTo(input);
  }

  async takeScreenshot(
    input: ScreenshotInput,
  ): Promise<ScreenshotResult> {
    this.assertBrowserSupported();
    assertScreenshotSemantics(input);
    return this.getBridgeClient().takeScreenshot(input);
  }

  async listTabs(
    input: ListTabsInput = {},
  ): Promise<ListTabsResult> {
    this.assertBrowserSupported();
    assertListTabsSemantics(input);
    return this.getBridgeClient().listTabs(input);
  }

  async readPage(
    input: ReadPageInput,
  ): Promise<ReadPageResult> {
    this.assertBrowserSupported();
    assertReadPageSemantics(input);
    return this.getBridgeClient().readPage(input);
  }

  async runScript(
    input: RunScriptInput,
  ): Promise<RunScriptResult> {
    this.assertBrowserSupported();
    assertRunScriptSemantics(input);
    return this.getBridgeClient().runScript(input);
  }

  async domSnapshot(
    input: DomSnapshotInput,
  ): Promise<DomSnapshotResult> {
    this.assertBrowserSupported();
    assertDomSnapshotSemantics(input);
    return this.getBridgeClient().domSnapshot(input);
  }

  async closeTab(input: CloseTabInput): Promise<CloseTabResult> {
    this.assertBrowserSupported();
    assertCloseTabSemantics(input);
    return this.getBridgeClient().closeTab(input);
  }

  private assertBrowserSupported(): void {
    if (!this.isBrowserSupported()) {
      throw new BrowserToolError(
        "browser_unsupported_in_current_environment",
        "Browser tools are unavailable because the local Electron browser bridge is not configured.",
      );
    }
  }

  private getBridgeClient(): BrowserBridgeClient {
    const client = BrowserBridgeClient.fromConfig(
      getBrowserBridgeConfigResolver().resolve(),
    );
    if (!client) {
      throw new BrowserToolError(
        "browser_bridge_unavailable",
        "Browser bridge is not configured for the current runtime.",
      );
    }
    return client;
  }
}

let cachedBrowserToolService: BrowserToolService | null = null;

export const getBrowserToolService = (): BrowserToolService => {
  if (!cachedBrowserToolService) {
    cachedBrowserToolService = new BrowserToolService();
  }
  return cachedBrowserToolService;
};
