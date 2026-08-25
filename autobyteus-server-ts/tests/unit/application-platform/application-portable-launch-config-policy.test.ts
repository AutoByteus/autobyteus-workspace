import { describe, expect, it } from "vitest";
import {
  ApplicationPortableLaunchConfigError,
  ApplicationPortableLaunchConfigPolicy,
} from "../../../src/application-platform/launch-configuration/application-portable-launch-config-policy.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

describe("ApplicationPortableLaunchConfigPolicy", () => {
  const policy = new ApplicationPortableLaunchConfigPolicy();

  it("accepts the exact portable token-count and typed pricing fields", () => {
    const llmConfig = {
      max_tokens: 4_096,
      token_limit: 128_000,
      safety_margin_tokens: 1_024,
      system_message: "The word token in prose is harmless.",
      extra_params: {
        response_format: {
          type: "json_schema",
          metadata: [{ label: "portable" }],
        },
      },
      pricing_config: {
        input_token_pricing: 1.5,
        output_token_pricing: 3,
        cached_input_read_token_pricing: 0.25,
        currency: "USD",
        pricing_source: "package",
        pricing_effective_date: "2026-07-29",
        input_token_pricing_tiers: [{
          tier_id: "long-context",
          max_input_tokens: 200_000,
          input_token_pricing: 2,
          output_token_pricing: 4,
        }],
      },
    };

    expect(() => policy.assertPortableDefaultLaunchConfig({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "portable-model",
      llmConfig,
    }, "agents.researcher.defaultLaunchConfig")).not.toThrow();
    expect(() => policy.assertPortableLlmConfig({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmConfig,
      path: "agents.researcher.defaultLaunchConfig.llmConfig",
    })).not.toThrow();
  });

  it.each([
    ["password", { password: "sentinel-password" }],
    ["authorization", { authorization: "sentinel-authorization" }],
    ["access token value", { access_token_value: "sentinel-access-token" }],
    ["server URL", { server_url: "sentinel-server-url" }],
    ["API URL", { api_url: "sentinel-api-url" }],
    ["base URI", { baseUri: "sentinel-base-uri" }],
    ["connection string", { connection_string: "sentinel-connection-string" }],
    ["DSN", { dsn: "sentinel-dsn" }],
    ["qualified endpoint address", { service_address: "sentinel-service-address" }],
    ["access key", { access_key: "sentinel-access-key" }],
    ["account key", { accountKey: "sentinel-account-key" }],
    ["client key", { client_key: "sentinel-client-key" }],
    ["subscription key", { subscriptionKey: "sentinel-subscription-key" }],
    ["authentication alias", { auth_config: "sentinel-auth-config" }],
    ["host alias", { provider_host: "sentinel-host" }],
    ["workspace alias", { workspace_root: "sentinel-workspace" }],
    ["machine path", { machine_path: "sentinel-machine-path" }],
  ])("rejects a recursively nested %s at its exact path without echoing the value", (
    _label,
    forbidden,
  ) => {
    let captured: unknown;
    try {
      policy.assertPortableDefaultLaunchConfig({
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "portable-model",
        llmConfig: {
          extra_params: {
            transports: [{ safe: true }, { nested: forbidden }],
          },
        },
      }, "agents.researcher.defaultLaunchConfig");
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(ApplicationPortableLaunchConfigError);
    const failure = captured as ApplicationPortableLaunchConfigError;
    const key = Object.keys(forbidden)[0]!;
    expect(failure.code).toBe("PACKAGE_FORBIDDEN_HOST_FIELD");
    expect(failure.configPath).toBe(
      `agents.researcher.defaultLaunchConfig.llmConfig.extra_params.transports[1].nested.${key}`,
    );
    expect(failure.message).toContain(failure.configPath);
    expect(failure.message).not.toContain(String(forbidden[key]));
  });

  it("rejects token-like aliases outside the closed token-count and pricing schema", () => {
    expect(() => policy.assertPortableLlmConfig({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmConfig: {
        extra_params: {
          max_tokens: 123,
        },
      },
      path: "agent.defaultLaunchConfig.llmConfig",
    })).toThrowError(expect.objectContaining({
      code: "PACKAGE_FORBIDDEN_HOST_FIELD",
      configPath: "agent.defaultLaunchConfig.llmConfig.extra_params.max_tokens",
    }));
  });
});
