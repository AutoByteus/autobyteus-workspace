import type { BrowserBridgeClientConfig } from "./browser-bridge-client.js";
import { BrowserToolError } from "./browser-tool-contract.js";
import { getBrowserToolRegistrySync } from "./browser-tool-registry-sync.js";

export type RuntimeBrowserBridgeBinding = BrowserBridgeClientConfig & {
  expiresAt: string;
};

function normalizeRuntimeBinding(input: RuntimeBrowserBridgeBinding): RuntimeBrowserBridgeBinding {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, "");
  const authToken = input.authToken.trim();
  const expiresAt = input.expiresAt.trim();

  if (!baseUrl || !authToken || !expiresAt) {
    throw new BrowserToolError(
      "browser_bridge_unavailable",
      "Remote browser bridge registration is missing required fields.",
    );
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    throw new BrowserToolError(
      "browser_bridge_unavailable",
      "Remote browser bridge registration has an invalid expiry timestamp.",
    );
  }

  return {
    baseUrl,
    authToken,
    expiresAt,
  };
}

export class RuntimeBrowserBridgeRegistrationService {
  private currentBinding: RuntimeBrowserBridgeBinding | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;

  registerBinding(input: RuntimeBrowserBridgeBinding): RuntimeBrowserBridgeBinding {
    const binding = normalizeRuntimeBinding(input);
    if (Date.parse(binding.expiresAt) <= Date.now()) {
      throw new BrowserToolError(
        "browser_bridge_unavailable",
        "Remote browser bridge registration is already expired.",
      );
    }

    this.currentBinding = binding;
    this.scheduleExpiry(binding.expiresAt);
    this.syncToolRegistry();
    return binding;
  }

  clearBinding(_reason: "manual_revoke" | "expired" | "replaced" = "manual_revoke"): void {
    this.cancelExpiryTimer();
    this.currentBinding = null;
    this.syncToolRegistry();
  }

  getCurrentBinding(): BrowserBridgeClientConfig | null {
    if (!this.currentBinding) {
      return null;
    }

    if (Date.parse(this.currentBinding.expiresAt) <= Date.now()) {
      this.clearBinding("expired");
      return null;
    }

    return {
      baseUrl: this.currentBinding.baseUrl,
      authToken: this.currentBinding.authToken,
    };
  }

  hasActiveBinding(): boolean {
    return this.getCurrentBinding() !== null;
  }

  private scheduleExpiry(expiresAt: string): void {
    this.cancelExpiryTimer();
    const delayMs = Math.max(0, Date.parse(expiresAt) - Date.now());
    this.expiryTimer = setTimeout(() => {
      this.clearBinding("expired");
    }, delayMs);
  }

  private cancelExpiryTimer(): void {
    if (!this.expiryTimer) {
      return;
    }
    clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }

  private syncToolRegistry(): void {
    getBrowserToolRegistrySync().syncWithSupport({
      hasRuntimeBinding: this.currentBinding !== null,
    });
  }
}

let cachedRuntimeBrowserBridgeRegistrationService: RuntimeBrowserBridgeRegistrationService | null = null;

export const getRuntimeBrowserBridgeRegistrationService =
  (): RuntimeBrowserBridgeRegistrationService => {
    if (!cachedRuntimeBrowserBridgeRegistrationService) {
      cachedRuntimeBrowserBridgeRegistrationService = new RuntimeBrowserBridgeRegistrationService();
    }
    return cachedRuntimeBrowserBridgeRegistrationService;
  };
