import fs from "node:fs/promises";
import { workspaceCollisionPolicyForScope } from "../../shared/workspace-skill-collision-policy.js";
import { createBackendPreparation } from "../../agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../agent-run-backend-factory.js";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import { AgyAgentRunContext } from "./agy-agent-run-context.js";
import { AgyAgentRunBackend } from "./agy-agent-run-backend.js";
import { AgyStreamProcess } from "../stream/agy-stream-process.js";
import { createAgyRunCapsule, restoreAgyRunCapsule, type AgyRunCapsule } from "../capsule/agy-run-capsule.js";
import {
  AGY_COMPACTION_DETECTION_MIN_VERSION,
  isAgyCompactionDetectionSupported,
  listAntigravityModels,
  readAntigravityCliVersion,
} from "../../../../runtime-management/antigravity-cli-capability.js";
import type { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../../skills/services/skill-service.js";
import type { ClaudeWorkspaceResolver } from "../../claude/claude-workspace-resolver.js";
import type { AgentToolMcpRunSessionActivator } from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { resolveRuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { composeSharedCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";
import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";

export class AgyAgentRunBackendFactory implements AgentRunBackendFactory {
  constructor(
    private readonly definitions: AgentDefinitionService,
    private readonly skills: SkillService,
    private readonly workspaces: ClaudeWorkspaceResolver,
    private readonly mcpSessions: AgentToolMcpRunSessionActivator,
  ) {}

  beginPreparation(request: AgentRunBackendPreparationRequest) {
    let process: AgyStreamProcess | null = null;
    const ownProcess = (value: AgyStreamProcess) => { process = value; };
    return createBackendPreparation({
      prepare: (assertAccepting) => request.kind === "new"
        ? this.createBackend(request.config, request.runId, assertAccepting, ownProcess)
        : this.restoreBackend(request.context, assertAccepting, ownProcess),
      releaseResources: async () => { await process?.stop(); },
    });
  }

  private async createBackend(config: AgentRunConfig, runId: string, assertAccepting: () => void, ownProcess: (process: AgyStreamProcess) => void): Promise<AgyAgentRunBackend> {
    await this.assertAvailable(config);
    const memoryDir = this.requireMemoryDir(config);
    const workspacePath = await this.workspaces.resolveWorkingDirectory(config.workspaceId);
    const definition = await this.definitions.getAgentDefinitionById(config.agentDefinitionId);
    if (!definition) throw new Error(`AGY_AGENT_DEFINITION_MISSING: ${config.agentDefinitionId}`);
    const bindings = this.skills.resolveConfiguredSkillBindingsForAgent(definition);
    const identity = composeSharedCarpenterPrompt({ agentDefinition: definition, memberExecutionContext: config.memberExecutionContext });
    assertAccepting();
    const descriptor = this.activateMcp(runId, config, workspacePath, definition);
    const capsule = await createAgyRunCapsule({ runId, memoryDir, workspacePath, identity,
      agentDefinitionId: config.agentDefinitionId, configuredSkillBindings: bindings,
      workspaceCollisionPolicy: workspaceCollisionPolicyForScope(this.skills.resolveSkillScope(definition)),
      mcpDescriptor: descriptor });
    assertAccepting();
    return this.launch(config, runId, capsule, null, assertAccepting, ownProcess);
  }

  private async restoreBackend(context: AgentRunContext<RuntimeAgentRunContext>, assertAccepting: () => void, ownProcess: (process: AgyStreamProcess) => void): Promise<AgyAgentRunBackend> {
    const config = context.config;
    await this.assertAvailable(config);
    const conversationId = context.runtimeContext instanceof AgyAgentRunContext
      ? context.runtimeContext.conversationId : null;
    if (!conversationId || conversationId === context.runId)
      throw new Error("PLATFORM_AGENT_RUN_BINDING_INVALID: AGY restore requires exact conversation ID.");
    const memoryDir = this.requireMemoryDir(config);
    const manifestPath = `${memoryDir}/agy-project/manifest.json`;
    const saved = JSON.parse(await fs.readFile(manifestPath, "utf8")) as { workspacePath?: string };
    if (!saved.workspacePath) throw new Error("AGY_CAPSULE_INVALID: missing selected workspace.");
    const currentWorkspace = await this.workspaces.resolveWorkingDirectory(config.workspaceId);
    const definition = await this.definitions.getAgentDefinitionById(config.agentDefinitionId);
    if (!definition) throw new Error(`AGY_AGENT_DEFINITION_MISSING: ${config.agentDefinitionId}`);
    // Restore retains the immutable main-agent text, even when the definition has been edited.
    assertAccepting();
    const descriptor = this.activateMcp(context.runId, config, saved.workspacePath, definition);
    const capsule = await restoreAgyRunCapsule({ runId: context.runId, memoryDir,
      selectedWorkspacePath: currentWorkspace, mcpDescriptor: descriptor });
    assertAccepting();
    return this.launch(config, context.runId, capsule, conversationId, assertAccepting, ownProcess);
  }

  private async launch(config: AgentRunConfig, runId: string, capsule: AgyRunCapsule, expectedId: string | null, assertAccepting: () => void, ownProcess: (process: AgyStreamProcess) => void): Promise<AgyAgentRunBackend> {
    const compactionDetection = await this.resolveCompactionDetection(runId);
    const process = new AgyStreamProcess();
    ownProcess(process);
    assertAccepting();
      const init = await process.start({ capsulePath: capsule.path, agentName: capsule.manifest.agentName,
        workspacePath: capsule.manifest.workspacePath, model: config.llmModelIdentifier,
        conversationId: expectedId });
      if (expectedId && init.conversation_id !== expectedId) throw new Error("AGY_CONVERSATION_ID_CONFLICT: exact restore returned a different conversation.");
      if (init.init.agent !== capsule.manifest.agentName) throw new Error("AGY_AGENT_NOT_LOADED: CLI did not select the generated main agent.");
      if (init.init.model !== config.llmModelIdentifier) throw new Error("AGY_MODEL_MISMATCH: CLI selected another model.");
      const cwd = await fs.realpath(String(init.init.cwd));
      if (cwd !== await fs.realpath(capsule.path)) throw new Error("AGY_PROJECT_MISMATCH: CLI did not use the run capsule.");
      // AGY always runs with auto-approve (skip-permissions), whatever the stored or submitted setting.
      if (init.init.permission_mode !== "always-proceed") throw new Error("AGY_PERMISSION_MODE_MISMATCH");
      assertAccepting();
      return new AgyAgentRunBackend(new AgentRunContext({ runId, config,
        runtimeContext: new AgyAgentRunContext(init.conversation_id) }), process, { compactionDetection });
  }

  /** Compaction checkpoints are mapped only on the AGY version proven to stream them. */
  private async resolveCompactionDetection(runId: string): Promise<boolean> {
    const version = await readAntigravityCliVersion();
    const supported = isAgyCompactionDetectionSupported(version);
    if (!supported) console.info(`AGY compaction detection off for run ${runId}: CLI version ` +
      `${version ?? "unknown"} is below ${AGY_COMPACTION_DETECTION_MIN_VERSION} or unreadable.`);
    return supported;
  }

  private activateMcp(runId: string, config: AgentRunConfig, workspacePath: string, definition: NonNullable<Awaited<ReturnType<AgentDefinitionService["getAgentDefinitionById"]>>>): AgentToolMcpDescriptor | null {
    const member = config.memberExecutionContext;
    const result = this.mcpSessions.activateForRun({
      owner: member ? { runId, collaborationIdentity: member.identity,
        displayName: getAgentTeamAddressBasename(member.identity.memberAddress) } : { runId },
      sender: buildAgentRunMessageSenderContext({ senderRunId: runId,
        senderName: member ? getAgentTeamAddressBasename(member.identity.memberAddress) : config.agentDefinitionId,
        runtimeKind: config.runtimeKind, memberExecutionContext: member }),
      runtimeExposure: resolveRuntimeAgentToolExposure(definition, member),
      executionContext: { workingDirectory: workspacePath, memoryDir: config.memoryDir,
        applicationExecutionContext: config.applicationExecutionContext },
      runtimeKind: config.runtimeKind,
    });
    return result.kind === "active" ? result.descriptor : null;
  }

  private async assertAvailable(config: AgentRunConfig): Promise<void> {
    if (!(await listAntigravityModels()).some((model) => model.id === config.llmModelIdentifier))
      throw new Error(`AGY_MODEL_UNAVAILABLE: ${config.llmModelIdentifier}`);
  }

  private requireMemoryDir(config: AgentRunConfig): string {
    if (!config.memoryDir) throw new Error("AGY_MEMORY_DIR_REQUIRED");
    return config.memoryDir;
  }
}
