import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { AgentFactory } from "autobyteus-ts/agent/factory/agent-factory.js";
import type { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import {
  ChunkResponse,
  CompleteResponse,
} from "autobyteus-ts/llm/utils/response-types.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AutoByteusAgentRunBackendFactory } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import type { AutoByteusAgentRunBackend } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { loadAgentCustomizations } from "../../../src/startup/agent-customization-loader.js";
import { AgentToolRegistryReadiness } from "../../../src/startup/agent-tool-loader.js";
import { getGeneralProcessPublishedArtifactPublisher } from "../../../src/services/published-artifacts/published-artifact-publication-service.js";

class DeterministicLLM extends BaseLLM {
  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: "ready" });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: "ready", is_complete: true });
  }
}

const createDeterministicLLM = (): DeterministicLLM =>
  new DeterministicLLM(
    new LLMModel({
      name: "configured-skill-e2e",
      value: "configured-skill-e2e",
      canonicalName: "configured-skill-e2e",
      provider: LLMProvider.OPENAI,
    }),
    new LLMConfig(),
  );

describe("Configured skill on-demand loading active native runtime e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let dataRoot: string;
  let workspaceRoot: string;
  let registrySnapshot: ReturnType<typeof defaultToolRegistry.snapshot>;
  const activeBackends = new Set<AutoByteusAgentRunBackend>();
  const llms = new Set<DeterministicLLM>();

  beforeAll(async () => {
    dataRoot = await realpath(
      await mkdtemp(path.join(os.tmpdir(), "configured-skill-on-demand-e2e-")),
    );
    workspaceRoot = path.join(dataRoot, "workspace");
    await mkdir(workspaceRoot, { recursive: true });
    await writeFile(
      path.join(dataRoot, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(dataRoot);
    SkillService.resetInstance();

    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
    await new AgentToolRegistryReadiness({
      publishedArtifactPublicationService: getGeneralProcessPublishedArtifactPublisher(),
    }).registerRequiredGroups();
    loadAgentCustomizations();

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    for (const backend of activeBackends) {
      await backend.terminate().catch(() => undefined);
    }
    activeBackends.clear();
    for (const llm of llms) {
      await llm.cleanup();
    }
    llms.clear();
    defaultToolRegistry.restore(registrySnapshot);
    SkillService.resetInstance();
    await rm(dataRoot, { recursive: true, force: true });
  });

  const execGraphql = async <T>(
    source: string,
    variableValues?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({ schema, source, variableValues });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const createAgentDefinition = async (input: {
    name: string;
    toolNames: string[];
    skillNames: string[];
  }): Promise<string> => {
    const result = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(
      `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) { id }
        }
      `,
      {
        input: {
          name: input.name,
          role: "assistant",
          description: "Configured skill on-demand loading E2E agent",
          instructions: "Follow the configured skill catalog exactly.",
          category: "runtime-e2e",
          toolNames: input.toolNames,
          skillNames: input.skillNames,
        },
      },
    );
    return result.createAgentDefinition.id;
  };

  const createBackend = async (input: {
    agentDefinitionId: string;
    runId: string;
  }): Promise<AutoByteusAgentRunBackend> => {
    const workspace = {
      workspaceId: "configured_skill_workspace",
      getName: () => "Configured Skill Workspace",
      getBasePath: () => workspaceRoot,
    };
    const factory = new AutoByteusAgentRunBackendFactory({
      agentDefinitionService: AgentDefinitionService.getInstance(),
      skillService: SkillService.getInstance(),
      agentFactory: new AgentFactory(),
      createLLM: async () => {
        const llm = createDeterministicLLM();
        llms.add(llm);
        return llm;
      },
      workspaceManager: {
        getWorkspaceById: (workspaceId: string) =>
          workspaceId === workspace.workspaceId ? workspace : undefined,
        getOrCreateTempWorkspace: async () => workspace,
      } as any,
      compactionAgentRunnerFactory: async () => ({
        runCompactionTask: vi.fn(),
      }),
    });
    const backend = await factory.createBackend(
      new AgentRunConfig({
        agentDefinitionId: input.agentDefinitionId,
        llmModelIdentifier: "configured-skill-e2e",
        autoExecuteTools: true,
        workspaceId: workspace.workspaceId,
        memoryDir: path.join(dataRoot, "memory", input.runId),
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      input.runId,
    );
    activeBackends.add(backend);
    return backend;
  };

  const terminateBackend = async (backend: AutoByteusAgentRunBackend): Promise<void> => {
    await backend.terminate();
    activeBackends.delete(backend);
  };

  it("keeps ordinary native tools and configured skill reads explicit in the same active run", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const skillName = `fresh_skill_${unique}`;
    const description = "Active native configured skill freshness fixture";
    const versionA = `SKILL_VERSION_A_${unique}`;
    const versionB = `SKILL_VERSION_B_${unique}`;
    const relativeToken = `RELATIVE_GUIDANCE_${unique}`;

    await execGraphql(
      `
        mutation CreateSkill($input: CreateSkillInput!) {
          createSkill(input: $input) { name }
        }
      `,
      {
        input: {
          name: skillName,
          description,
          content: `# Version A\n\n${versionA}\n\nRead [guidance](references/guidance.md).`,
        },
      },
    );
    const uploaded = await execGraphql<{ uploadSkillFile: boolean }>(
      `
        mutation UploadSkillFile($skillName: String!, $path: String!, $content: String!) {
          uploadSkillFile(skillName: $skillName, path: $path, content: $content)
        }
      `,
      {
        skillName,
        path: "references/guidance.md",
        content: relativeToken,
      },
    );
    expect(uploaded.uploadSkillFile).toBe(true);

    const noReaderAgentId = await createAgentDefinition({
      name: `no-reader-${unique}`,
      toolNames: [],
      skillNames: [skillName],
    });
    const noReaderBackend = await createBackend({
      agentDefinitionId: noReaderAgentId,
      runId: `no-reader-run-${unique}`,
    });
    const noReaderContext = noReaderBackend.getContext().runtimeContext as AgentContext;
    expect(noReaderBackend.isActive()).toBe(true);
    expect(Object.keys(noReaderContext.toolInstances)).toEqual([
      "run_bash",
      "read_file",
      "edit_file",
      "write_file",
    ]);
    expect(noReaderContext.processedSystemPrompt.match(/^## .+$/gm)).toEqual([
      "## Agent Identity",
      "## Working Environment",
      "## Bash Operating Practice",
      "## File And Directory Practice",
      "## Skills",
    ]);
    expect(noReaderContext.processedSystemPrompt).toContain(
      `- Agent workspace: \`${workspaceRoot}\``,
    );
    expect(noReaderContext.processedSystemPrompt).not.toContain("## Available Tools");
    expect(noReaderContext.processedSystemPrompt).not.toContain("- Role: assistant");
    expect(noReaderContext.processedSystemPrompt).toContain(`- **${skillName}**: ${description}`);
    expect(noReaderContext.processedSystemPrompt).not.toContain(versionA);
    await terminateBackend(noReaderBackend);

    const retiredToolNames = ["get_available_skills", "get_skill_content", "load_skill"];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const readerAgentId = await createAgentDefinition({
        name: `reader-${unique}`,
        toolNames: [
          retiredToolNames[0]!,
          "read_file",
          "run_bash",
          ...retiredToolNames.slice(1),
        ],
        skillNames: [skillName],
      });
      const readerBackend = await createBackend({
        agentDefinitionId: readerAgentId,
        runId: `reader-run-${unique}`,
      });
      const runtimeContext = readerBackend.getContext().runtimeContext as AgentContext;
      expect(readerBackend.isActive()).toBe(true);
      expect(Object.keys(runtimeContext.toolInstances)).toEqual([
        "run_bash",
        "read_file",
        "edit_file",
        "write_file",
      ]);
      for (const retiredToolName of retiredToolNames) {
        expect(runtimeContext.toolInstances).not.toHaveProperty(retiredToolName);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Tool '${retiredToolName}'`),
        );
      }

      const skillEntryPath = path.join(dataRoot, "skills", skillName, "SKILL.md");
      expect(path.dirname(skillEntryPath)).not.toBe(workspaceRoot);
      expect(runtimeContext.processedSystemPrompt).toContain(
        `- **SKILL.md:** \`${skillEntryPath}\``,
      );
      expect(runtimeContext.processedSystemPrompt).not.toContain(versionA);

      const readTool = runtimeContext.getTool("read_file");
      expect(readTool).toBeDefined();
      const firstRead = await readTool!.execute(runtimeContext, {
        path: skillEntryPath,
        include_line_numbers: false,
      });
      expect(firstRead).toContain(versionA);
      expect(firstRead).not.toContain(versionB);

      const updated = await execGraphql<{
        updateSkill: { name: string; description: string; content: string };
      }>(
        `
          mutation UpdateSkill($input: UpdateSkillInput!) {
            updateSkill(input: $input) { name description content }
          }
        `,
        {
          input: {
            name: skillName,
            content: `# Version B\n\n${versionB}\n\nRead [guidance](references/guidance.md).`,
          },
        },
      );
      expect(updated.updateSkill.content).toContain(versionB);

      const secondRead = await readTool!.execute(runtimeContext, {
        path: skillEntryPath,
        include_line_numbers: false,
      });
      expect(secondRead).toContain(versionB);
      expect(secondRead).not.toContain(versionA);

      const relativeRead = await readTool!.execute(runtimeContext, {
        path: "references/guidance.md",
        base_dir: path.dirname(skillEntryPath),
        include_line_numbers: false,
      });
      expect(relativeRead).toBe(relativeToken);
      expect(runtimeContext.processedSystemPrompt).not.toContain(versionB);

      const runBashTool = runtimeContext.getTool("run_bash");
      expect(runBashTool).toBeDefined();
      const skillPackageAfterSupportedUpdate = await readFile(skillEntryPath, "utf-8");
      const defaultCwdResult = await runBashTool!.execute(runtimeContext, {
        command: "pwd && printf 'workspace-output' > carpenter-output.txt",
      }) as { stdout: string; effectiveCwd: string };
      expect(defaultCwdResult.stdout.trim()).toBe(workspaceRoot);
      expect(defaultCwdResult.effectiveCwd).toBe(workspaceRoot);
      expect(await readFile(path.join(workspaceRoot, "carpenter-output.txt"), "utf-8"))
        .toBe("workspace-output");
      expect(await readFile(skillEntryPath, "utf-8")).toBe(skillPackageAfterSupportedUpdate);

      const nestedWorkspace = path.join(workspaceRoot, "nested-task");
      await mkdir(nestedWorkspace, { recursive: true });
      const nestedCwdResult = await runBashTool!.execute(runtimeContext, {
        command: "pwd",
        cwd: nestedWorkspace,
      }) as { stdout: string; effectiveCwd: string };
      expect(nestedCwdResult.stdout.trim()).toBe(nestedWorkspace);
      expect(nestedCwdResult.effectiveCwd).toBe(nestedWorkspace);
      expect(runtimeContext.processedSystemPrompt).toContain(
        `- Agent workspace: \`${workspaceRoot}\``,
      );

      await terminateBackend(readerBackend);
    } finally {
      warnSpy.mockRestore();
    }
  }, 30_000);
});
