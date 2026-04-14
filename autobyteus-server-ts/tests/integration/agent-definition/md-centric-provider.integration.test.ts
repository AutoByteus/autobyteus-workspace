import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  AgentMdParseError,
  serializeAgentMd,
} from "../../../src/agent-definition/utils/agent-md-parser.js";
import { FileAgentDefinitionProvider } from "../../../src/agent-definition/providers/file-agent-definition-provider.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { buildCanonicalApplicationOwnedAgentId } from "../../../src/application-bundles/utils/application-bundle-identity.js";

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe("md-centric provider integration", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = "";
    vi.restoreAllMocks();
  });

  it("throws AgentMdParseError when agent.md is malformed", async () => {
    const dataDir = appConfigProvider.config.getAppDataDir();
    const agentId = uniqueId("bad_agent");
    const agentDir = path.join(dataDir, "agents", agentId);
    cleanupPaths.add(agentDir);

    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(path.join(agentDir, "agent.md"), "name: malformed", "utf-8");
    await fs.writeFile(path.join(agentDir, "agent-config.json"), "{}\n", "utf-8");

    const provider = new FileAgentDefinitionProvider();
    await expect(provider.getById(agentId)).rejects.toBeInstanceOf(AgentMdParseError);
  });

  it("preserves unknown agent-config fields across update round-trips", async () => {
    const dataDir = appConfigProvider.config.getAppDataDir();
    const agentId = uniqueId("unknown_field_agent");
    const agentDir = path.join(dataDir, "agents", agentId);
    cleanupPaths.add(agentDir);

    const provider = new FileAgentDefinitionProvider();
    await provider.create(
      new AgentDefinition({
        id: agentId,
        name: "Unknown Field Agent",
        role: "assistant",
        description: "unknown field preservation",
        category: "integration",
        instructions: "Keep unknown config fields during update.",
        toolNames: ["tool-a"],
        skillNames: ["skill-a"],
      }),
    );

    const agentConfigPath = path.join(agentDir, "agent-config.json");
    const originalConfig = JSON.parse(await fs.readFile(agentConfigPath, "utf-8")) as Record<string, unknown>;
    originalConfig.futureConfig = { nestedFlag: true };
    await fs.writeFile(agentConfigPath, JSON.stringify(originalConfig, null, 2), "utf-8");

    await provider.update(
      new AgentDefinition({
        id: agentId,
        name: "Unknown Field Agent",
        role: "assistant",
        description: "updated unknown field preservation",
        category: "integration",
        instructions: "Updated instructions.",
        toolNames: ["tool-a", "tool-b"],
        skillNames: ["skill-a", "skill-b"],
      }),
    );

    const updatedConfig = JSON.parse(await fs.readFile(agentConfigPath, "utf-8")) as Record<string, unknown>;
    expect(updatedConfig.futureConfig).toEqual({ nestedFlag: true });
    expect(updatedConfig.toolNames).toEqual(["tool-a", "tool-b"]);
    expect(updatedConfig.skillNames).toEqual(["skill-a", "skill-b"]);
  });

  it("persists defaultLaunchConfig when creating a shared agent definition", async () => {
    const dataDir = appConfigProvider.config.getAppDataDir();
    const agentId = uniqueId("default_launch_agent");
    const agentDir = path.join(dataDir, "agents", agentId);
    cleanupPaths.add(agentDir);

    const provider = new FileAgentDefinitionProvider();
    const created = await provider.create(
      new AgentDefinition({
        id: agentId,
        name: "Default Launch Agent",
        role: "assistant",
        description: "Persists launch defaults",
        category: "integration",
        instructions: "Use the configured launch defaults.",
        defaultLaunchConfig: {
          runtimeKind: "autobyteus",
          llmModelIdentifier: "gpt-5.4-mini",
          llmConfig: {
            reasoning_effort: "medium",
          },
        },
      }),
    );

    expect(created.defaultLaunchConfig).toEqual({
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: {
        reasoning_effort: "medium",
      },
    });

    const config = JSON.parse(
      await fs.readFile(path.join(agentDir, "agent-config.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(config.defaultLaunchConfig).toEqual({
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: {
        reasoning_effort: "medium",
      },
    });
  });

  it("updates imported definitions in place without inferring bundled skills when config skillNames are empty", async () => {
    const externalRoot = path.join(
      path.dirname(appConfigProvider.config.getAppDataDir()),
      uniqueId("external_definition_source"),
    );
    cleanupPaths.add(externalRoot);
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = externalRoot;

    const agentId = uniqueId("imported_agent");
    const agentDir = path.join(externalRoot, "agents", agentId);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(
      path.join(agentDir, "agent.md"),
      serializeAgentMd(
        {
          name: "Imported Agent",
          description: "Imported description",
          category: "integration",
          role: "assistant",
        },
        "Imported instructions",
      ),
      "utf-8",
    );
    await fs.writeFile(path.join(agentDir, "agent-config.json"), "{}\n", "utf-8");
    await fs.writeFile(
      path.join(agentDir, "SKILL.md"),
      `---\nname: ${agentId}\ndescription: Bundled skill\n---\n\nBundled content\n`,
      "utf-8",
    );

    const provider = new FileAgentDefinitionProvider();
    const imported = await provider.getById(agentId);
    expect(imported?.skillNames).toEqual([]);

    await provider.update(
      new AgentDefinition({
        id: agentId,
        name: "Imported Agent Updated",
        role: "assistant",
        description: "Updated imported description",
        category: "integration",
        instructions: "Updated instructions",
        toolNames: ["tool-a"],
        skillNames: [],
      }),
    );

    const updatedMd = await fs.readFile(path.join(agentDir, "agent.md"), "utf-8");
    const updatedConfig = JSON.parse(
      await fs.readFile(path.join(agentDir, "agent-config.json"), "utf-8"),
    ) as Record<string, unknown>;

    expect(updatedMd).toContain("Imported Agent Updated");
    expect(updatedMd).toContain("Updated imported description");
    expect(updatedConfig.toolNames).toEqual(["tool-a"]);
    expect(updatedConfig.skillNames).toEqual([]);
  });

  it("keeps explicit skillNames authoritative when a bundled skill is also present", async () => {
    const externalRoot = path.join(
      path.dirname(appConfigProvider.config.getAppDataDir()),
      uniqueId("external_definition_source_explicit_skills"),
    );
    cleanupPaths.add(externalRoot);
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = externalRoot;

    const agentId = uniqueId("explicit_skill_agent");
    const agentDir = path.join(externalRoot, "agents", agentId);
    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(
      path.join(agentDir, "agent.md"),
      serializeAgentMd(
        {
          name: "Explicit Skills Agent",
          description: "Imported description",
          category: "integration",
          role: "assistant",
        },
        "Imported instructions",
      ),
      "utf-8",
    );
    await fs.writeFile(
      path.join(agentDir, "agent-config.json"),
      JSON.stringify({ skillNames: ["shared-skill"] }, null, 2),
      "utf-8",
    );
    await fs.writeFile(
      path.join(agentDir, "SKILL.md"),
      `---\nname: ${agentId}\ndescription: Bundled skill\n---\n\nBundled content\n`,
      "utf-8",
    );

    const provider = new FileAgentDefinitionProvider();
    const imported = await provider.getById(agentId);
    expect(imported?.skillNames).toEqual(["shared-skill"]);
  });

  it("updates application-owned agent defaultLaunchConfig in place", async () => {
    const packageId = uniqueId("pkg");
    const localApplicationId = "math-app";
    const localAgentId = "tutor";
    const definitionId = buildCanonicalApplicationOwnedAgentId(
      packageId,
      localApplicationId,
      localAgentId,
    );

    const applicationRootPath = path.join(
      path.dirname(appConfigProvider.config.getAppDataDir()),
      uniqueId("application_owned_agent_source"),
    );
    const packageRootPath = path.dirname(applicationRootPath);
    const agentDir = path.join(applicationRootPath, "agents", localAgentId);
    cleanupPaths.add(applicationRootPath);

    await fs.mkdir(agentDir, { recursive: true });
    await fs.writeFile(
      path.join(agentDir, "agent.md"),
      serializeAgentMd(
        {
          name: "Tutor",
          description: "Original description",
          category: "integration",
          role: "assistant",
        },
        "Original instructions",
      ),
      "utf-8",
    );
    await fs.writeFile(path.join(agentDir, "agent-config.json"), "{}\n", "utf-8");

    vi.spyOn(ApplicationBundleService, "getInstance").mockReturnValue({
      getApplicationOwnedAgentSourceById: vi.fn(async (requestedId: string) =>
        requestedId === definitionId
          ? {
              definitionId,
              applicationId: `bundle-app-${localApplicationId}`,
              applicationName: "Math App",
              packageId,
              localApplicationId,
              localDefinitionId: localAgentId,
              applicationRootPath,
              packageRootPath,
              writable: true,
            }
          : null,
      ),
    } as unknown as ApplicationBundleService);

    const provider = new FileAgentDefinitionProvider();
    await provider.update(
      new AgentDefinition({
        id: definitionId,
        name: "Tutor Updated",
        role: "assistant",
        description: "Updated description",
        category: "integration",
        instructions: "Updated instructions",
        defaultLaunchConfig: {
          runtimeKind: "codex_app_server",
          llmModelIdentifier: "gpt-5.4",
          llmConfig: {
            temperature: 0.2,
          },
        },
      }),
    );

    const updatedConfig = JSON.parse(
      await fs.readFile(path.join(agentDir, "agent-config.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(updatedConfig.defaultLaunchConfig).toEqual({
      runtimeKind: "codex_app_server",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        temperature: 0.2,
      },
    });
  });
});
