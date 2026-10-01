import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Skill } from "../../../../../src/skills/domain/models.js";
import { RuntimeKind, isExternalProviderRuntimeKind, runtimeKindFromString } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { getRuntimeAvailabilityService } from "../../../../../src/runtime-management/runtime-availability-service.js";
import { buildAgentRunRestoreRuntimeContext } from "../../../../../src/agent-execution/services/agent-run-restore-context-factory.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AcpAgentRunContext } from "../../../../../src/agent-execution/backends/acp/backend/acp-agent-run-context.js";
import { ModelCatalogService } from "../../../../../src/llm-management/services/model-catalog-service.js";
import { AgentRunResumeConfigService } from "../../../../../src/run-history/services/agent-run-resume-config-service.js";
import { ApplicationProviderCredentialReadinessAdapter } from "../../../../../src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.js";
import {
  GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE,
  getGrokWorkspaceSkillMaterializer,
} from "../../../../../src/agent-execution/backends/grok/grok-workspace-skill-materializer.js";

const tempRoots: string[] = [];
const savedCommand = process.env.GROK_BUILD_COMMAND;
afterEach(async () => {
  if (savedCommand === undefined) delete process.env.GROK_BUILD_COMMAND; else process.env.GROK_BUILD_COMMAND = savedCommand;
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("grok_build runtime registration", () => {
  it("is a fifth, external-provider runtime kind", () => {
    expect(Object.values(RuntimeKind)).toEqual(["autobyteus", "claude_agent_sdk", "codex_app_server", "antigravity_cli", "grok_build"]);
    expect(runtimeKindFromString("grok_build")).toBe(RuntimeKind.GROK_BUILD);
    expect(isExternalProviderRuntimeKind(RuntimeKind.GROK_BUILD)).toBe(true);
  });

  it("reports an unavailable Grok CLI as a disabled runtime with a safe reason", async () => {
    process.env.GROK_BUILD_COMMAND = path.join(os.tmpdir(), "missing-grok-binary-for-test");
    await expect(getRuntimeAvailabilityService().getRuntimeAvailability(RuntimeKind.GROK_BUILD)).resolves.toEqual({
      runtimeKind: "grok_build", enabled: false,
      reason: "Grok CLI is unavailable; install it or set GROK_BUILD_COMMAND and retry.",
    });
  });

  it("restores from the stored Grok session id and references it as the run session", () => {
    const config = new AgentRunConfig({ agentDefinitionId: "d", llmModelIdentifier: "grok-4.7", autoExecuteTools: false,
      runtimeKind: RuntimeKind.GROK_BUILD });
    expect(buildAgentRunRestoreRuntimeContext(config, "session-1")).toEqual(new AcpAgentRunContext("session-1"));
    const service = new AgentRunResumeConfigService(os.tmpdir(), {} as never);
    expect((service as unknown as { buildRuntimeReference(metadata: unknown): unknown })
      .buildRuntimeReference({ runtimeKind: RuntimeKind.GROK_BUILD, platformAgentRunId: "session-1" }))
      .toEqual({ runtimeKind: "grok_build", sessionId: "session-1", threadId: null, metadata: null });
  });

  it("serves the Grok Build catalog for grok_build selections", async () => {
    const model = { model_identifier: "grok-4.7" };
    const service = new ModelCatalogService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
      { listModels: async () => [model] } as never);
    const catalog = await service.runtimeModelSelectionCatalog("grok_build");
    expect(catalog.offeredModels).toEqual([model]);
    expect(catalog.findExactCurrent("grok-4.7")).toBe(model);
  });

  it("has no AutoByteus credential authority (provider-owned auth, DEC-002)", () => {
    const adapter = new ApplicationProviderCredentialReadinessAdapter({ llmProviderService: {} as never, codexClientManager: {} as never });
    expect(adapter.resolveAuthority({ runtimeKind: RuntimeKind.GROK_BUILD, model: "grok-4.7", workspaceRootPath: "/w" } as never))
      .toEqual({ kind: "unsupported", runtime: "grok_build" });
  });

  it("materializes configured skills under .grok/skills and releases them (AC-010)", async () => {
    expect(GROK_WORKSPACE_SKILL_MATERIALIZATION_PROFILE.workspaceSkillsRootSegments).toEqual([".grok", "skills"]);
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "grok-skill-source-"));
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "grok-skill-workspace-"));
    tempRoots.push(source, workspace);
    await fs.writeFile(path.join(source, "SKILL.md"), "# Grok\n", "utf8");
    const skill = new Skill({ name: "grok-profile", description: "test", content: "# Grok", rootPath: source });
    const materializer = getGrokWorkspaceSkillMaterializer();
    const descriptors = await materializer.materializeConfiguredWorkspaceSkills({
      runId: "grok-run", workingDirectory: workspace, requests: [{ kind: "expose-resolved", skill }],
    });
    const link = path.join(workspace, ".grok", "skills", "grok-profile");
    expect(descriptors[0]!.materializedRootPath).toBe(link);
    expect((await fs.lstat(link)).isSymbolicLink()).toBe(true);
    await materializer.cleanupMaterializedWorkspaceSkills(descriptors);
    await expect(fs.lstat(link)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
