import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { validateStandaloneApplicationPackage } from "../../../src/application-platform/launch-configuration/application-standalone-package-validator.js";

const sourcePackageRoot = path.resolve(
  "../applications/brief-studio/dist/importable-package",
);
const researcherConfigRelativePath = path.join(
  "applications",
  "brief-studio",
  "agent-teams",
  "brief-studio-team",
  "agents",
  "researcher",
  "agent-config.json",
);

describe("standalone package portable launch defaults", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
    );
  });

  const copyBriefPackage = async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "brief-portable-package-"));
    tempRoots.push(root);
    const packageRoot = path.join(root, "package");
    await fs.cp(sourcePackageRoot, packageRoot, { recursive: true });
    return {
      packageRoot,
      agentConfigPath: path.join(packageRoot, researcherConfigRelativePath),
    };
  };

  const updateResearcherLlmConfig = async (
    agentConfigPath: string,
    llmConfig: Record<string, unknown>,
  ) => {
    const config = JSON.parse(await fs.readFile(agentConfigPath, "utf8")) as {
      defaultLaunchConfig: Record<string, unknown>;
    };
    config.defaultLaunchConfig.runtimeKind = "autobyteus";
    config.defaultLaunchConfig.llmModelIdentifier = "portable-model";
    config.defaultLaunchConfig.llmConfig = llmConfig;
    await fs.writeFile(agentConfigPath, `${JSON.stringify(config, null, 2)}\n`);
  };

  it("validates the real Brief package with exact token tuning and typed pricing", async () => {
    const getAgentDefinitions = vi.spyOn(AgentDefinitionService, "getInstance");
    const getTeamDefinitions = vi.spyOn(AgentTeamDefinitionService, "getInstance");
    const { packageRoot, agentConfigPath } = await copyBriefPackage();
    await updateResearcherLlmConfig(agentConfigPath, {
      max_tokens: 8_192,
      token_limit: 128_000,
      safety_margin_tokens: 2_048,
      pricing_config: {
        input_token_pricing: 1,
        output_token_pricing: 2,
        currency: "USD",
        pricing_source: "package",
        pricing_effective_date: "2026-07-29",
        input_token_pricing_tiers: [{
          tier_id: "large",
          max_input_tokens: 200_000,
          input_token_pricing: 1.5,
          output_token_pricing: 3,
        }],
      },
      extra_params: {
        response_format: {
          type: "json_schema",
          metadata: { use_case: "brief" },
        },
      },
    });

    const result = await validateStandaloneApplicationPackage({
      packageRoot,
      localApplicationId: "brief-studio",
    });

    expect(result.selection.localApplicationId).toBe("brief-studio");
    expect(result.selection.applicationRoot).toContain(packageRoot);
    expect(getAgentDefinitions).not.toHaveBeenCalled();
    expect(getTeamDefinitions).not.toHaveBeenCalled();
  });

  it.each([
    ["server_url", "sentinel-server-url"],
    ["api_url", "sentinel-api-url"],
    ["connection_string", "sentinel-connection-string"],
    ["access_key", "sentinel-access-key"],
    ["baseUri", "sentinel-base-uri"],
    ["service_address", "sentinel-service-address"],
    ["client_key", "sentinel-client-key"],
    ["auth_config", "sentinel-auth-config"],
  ])("rejects a real Brief package containing nested %s without echoing its value", async (
    key,
    sentinel,
  ) => {
    const { packageRoot, agentConfigPath } = await copyBriefPackage();
    await updateResearcherLlmConfig(agentConfigPath, {
      extra_params: {
        transport: {
          [key]: sentinel,
        },
      },
    });

    let captured: unknown;
    try {
      await validateStandaloneApplicationPackage({
        packageRoot,
        localApplicationId: "brief-studio",
      });
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(Error);
    const message = String((captured as Error).message);
    expect(message).toContain(`.llmConfig.extra_params.transport.${key}`);
    expect(message).toContain("host-owned");
    expect(message).not.toContain(sentinel);
  });
});
