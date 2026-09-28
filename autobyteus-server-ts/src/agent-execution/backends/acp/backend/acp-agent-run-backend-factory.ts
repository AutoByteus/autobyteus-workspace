import { SkillAccessMode, resolveSkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { skillRequestStrengthForScope } from "../../shared/skill-request-strength.js";
import type { SystemInstructionTraceRecord } from "autobyteus-ts";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import type { AgentRunEvent } from "../../../domain/agent-run-event.js";
import { AgentCreationError } from "../../../errors.js";
import type { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../../skills/services/skill-service.js";
import type { AgentToolMcpRunSessionActivator } from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import {
  getSystemInstructionCaptureService,
  type SystemInstructionCaptureService,
} from "../../../../agent-memory/services/system-instruction-capture-service.js";
import { resolveRuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { composeSharedCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";
import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { MaterializedWorkspaceSkill, WorkspaceSkillMaterializer } from "../../shared/workspace-skill-materializer.js";
import type { AcpAgentLaunchProfile } from "../../../../runtime-management/acp/acp-agent-launch-profile.js";
import { AcpAgentProcess } from "../../../../runtime-management/acp/acp-agent-process.js";
import { AcpClientConnection } from "../../../../runtime-management/acp/acp-client-connection.js";
import { AcpAgentCapabilities } from "../../../../runtime-management/acp/acp-agent-capabilities.js";
import { describeAcpActivationError } from "../../../../runtime-management/acp/acp-error-message.js";
import type { AcpAgentSessionProfile } from "../acp-agent-session-profile.js";
import { AcpAgentSession } from "../session/acp-agent-session.js";
import { AcpAgentRunBackend } from "./acp-agent-run-backend.js";
import { AcpAgentRunContext } from "./acp-agent-run-context.js";

type AgentDefinition = NonNullable<Awaited<ReturnType<AgentDefinitionService["getAgentDefinitionById"]>>>;

export type AcpWorkingDirectoryResolver = Readonly<{
  resolveWorkingDirectory(workspaceId?: string | null): Promise<string>;
}>;

export type AcpAgentRunBackendFactoryDependencies = Readonly<{
  launchProfile: AcpAgentLaunchProfile;
  sessionProfile: AcpAgentSessionProfile;
  definitions: AgentDefinitionService;
  skills: SkillService;
  workspaces: AcpWorkingDirectoryResolver;
  mcpSessions: AgentToolMcpRunSessionActivator;
  skillMaterializer: WorkspaceSkillMaterializer;
  instructionCapture?: SystemInstructionCaptureService;
}>;

type PreparedRun = Readonly<{
  workingDirectory: string;
  definition: AgentDefinition;
  descriptor: AgentToolMcpDescriptor | null;
  materializedSkills: MaterializedWorkspaceSkill[];
}>;

/** Forwards session output to the backend once it exists; activation emits no events before. */
class DeferredEventSink {
  target: AcpAgentRunBackend | null = null;
  emit = (events: AgentRunEvent[]): void => { this.target?.publish(events); };
  failed = (): void => { this.target?.handleSessionFailure(); };
}

const reasoningEffortOf = (config: AgentRunConfig): string | null => {
  const value = config.llmConfig?.reasoning_effort;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/**
 * Create/restore sequencing for any ACP agent, parameterized by its launch and session
 * profiles. Acquires workspace, skills, Agent Tools MCP, one agent process and one session;
 * on failure it stops the process and releases the skills it acquired. Agent JSON-RPC errors
 * and safe ACP errors surface as `AgentCreationError` so the caller shows the agent's text.
 */
export class AcpAgentRunBackendFactory implements AgentRunBackendFactory {
  constructor(private readonly deps: AcpAgentRunBackendFactoryDependencies) {}

  async createBackend(config: AgentRunConfig, runId: string): Promise<AcpAgentRunBackend> {
    const prepared = await this.prepare(config, runId);
    const composedPrompt = composeSharedCarpenterPrompt({
      agentDefinition: prepared.definition, memberExecutionContext: config.memberExecutionContext,
    });
    return this.launch(config, runId, prepared, async (session) => {
      const suppliedAt = Date.now() / 1000;
      const opened = await session.openNew({
        cwd: prepared.workingDirectory,
        mcpServers: this.deps.sessionProfile.mcpServers(prepared.descriptor),
        _meta: this.deps.sessionProfile.newSessionMeta({ composedPrompt, autoExecuteTools: config.autoExecuteTools }),
      });
      await this.awaitMcpReady(session, prepared.descriptor);
      return { sessionId: opened.sessionId, trace: this.captureInstructions(config, composedPrompt, suppliedAt) };
    });
  }

  async restoreBackend(context: AgentRunContext<RuntimeAgentRunContext>): Promise<AcpAgentRunBackend> {
    const sessionId = context.runtimeContext instanceof AcpAgentRunContext ? context.runtimeContext.sessionId : null;
    if (!sessionId || sessionId === context.runId) {
      throw new AgentCreationError(`PLATFORM_AGENT_RUN_BINDING_INVALID: ${this.deps.launchProfile.agentLabel} restore requires the exact session id.`);
    }
    const prepared = await this.prepare(context.config, context.runId);
    return this.launch(context.config, context.runId, prepared, async (session) => {
      // The agent keeps the run-start instructions; they are not re-sent on load.
      await session.openLoad({
        sessionId, cwd: prepared.workingDirectory,
        mcpServers: this.deps.sessionProfile.mcpServers(prepared.descriptor),
      });
      await this.awaitMcpReady(session, prepared.descriptor);
      return { sessionId, trace: null };
    }, true);
  }

  private async prepare(config: AgentRunConfig, runId: string): Promise<PreparedRun> {
    const workingDirectory = await this.deps.workspaces.resolveWorkingDirectory(config.workspaceId);
    const definition = await this.deps.definitions.getAgentDefinitionById(config.agentDefinitionId);
    if (!definition) throw new Error(`ACP_AGENT_DEFINITION_MISSING: ${config.agentDefinitionId}`);
    const bindings = this.deps.skills.resolveConfiguredSkillBindingsForAgent(definition);
    const skillAccessMode = resolveSkillAccessMode(config.skillAccessMode ?? null, bindings.length);
    const materializedSkills = await this.deps.skillMaterializer.materializeConfiguredWorkspaceSkills({
      runId, workingDirectory, skillAccessMode,
      requestStrength: skillRequestStrengthForScope(this.deps.skills.resolveSkillScope(definition)),
      requests: skillAccessMode === SkillAccessMode.NONE ? [] : bindings.map((binding) => binding.kind === "resolved"
        ? { kind: "expose-resolved" as const, skill: binding.skill }
        : { kind: "reconcile-unresolved" as const, name: binding.name }),
    });
    try {
      const descriptor = this.activateMcp(runId, config, workingDirectory, definition);
      return { workingDirectory, definition, descriptor, materializedSkills };
    } catch (error) {
      await this.deps.skillMaterializer.cleanupMaterializedWorkspaceSkills(materializedSkills);
      throw error;
    }
  }

  private async launch(
    config: AgentRunConfig,
    runId: string,
    prepared: PreparedRun,
    open: (session: AcpAgentSession) => Promise<{ sessionId: string; trace: SystemInstructionTraceRecord | null }>,
    restore = false,
  ): Promise<AcpAgentRunBackend> {
    const { launchProfile, sessionProfile } = this.deps;
    const process = AcpAgentProcess.spawn({
      command: launchProfile.command(),
      args: launchProfile.args({ model: config.llmModelIdentifier, reasoningEffort: reasoningEffortOf(config) }),
      env: launchProfile.env(globalThis.process.env),
      cwd: prepared.workingDirectory,
    });
    const connection = new AcpClientConnection(process, launchProfile.agentLabel);
    const sink = new DeferredEventSink();
    const session = new AcpAgentSession({
      runId, connection, profile: sessionProfile, model: config.llmModelIdentifier,
      autoExecuteTools: config.autoExecuteTools, emit: sink.emit, onFailed: sink.failed,
    });
    const releaseSkills = () => this.deps.skillMaterializer.cleanupMaterializedWorkspaceSkills(prepared.materializedSkills);
    try {
      const capabilities = AcpAgentCapabilities.fromInitialize(await connection.initialize());
      capabilities.require(launchProfile.agentLabel,
        AcpAgentCapabilities.requiredFor({ restore, mcp: prepared.descriptor !== null }));
      const opened = await open(session);
      const backend = new AcpAgentRunBackend({
        context: new AgentRunContext({
          runId, config, runtimeContext: new AcpAgentRunContext(opened.sessionId, prepared.workingDirectory),
        }),
        connection, session, pendingSystemInstruction: opened.trace, cleanup: releaseSkills,
      });
      sink.target = backend;
      if (session.state === "failed") throw new Error(`ACP_SESSION_FAILED: ${launchProfile.agentLabel} stopped during activation.`);
      return backend;
    } catch (error) {
      session.close();
      await connection.close();
      await releaseSkills();
      const message = describeAcpActivationError(launchProfile.agentLabel, error);
      throw message ? new AgentCreationError(message) : error;
    }
  }

  private async awaitMcpReady(session: AcpAgentSession, descriptor: AgentToolMcpDescriptor | null): Promise<void> {
    const requirement = this.deps.sessionProfile.mcpReadiness(descriptor);
    if (requirement) await session.awaitMcpServerReady(requirement);
  }

  private captureInstructions(config: AgentRunConfig, content: string, suppliedAt: number): SystemInstructionTraceRecord | null {
    if (!config.memoryDir) return null;
    const capture = (this.deps.instructionCapture ?? getSystemInstructionCaptureService())
      .capture({ memoryDir: config.memoryDir, content, suppliedAt });
    return capture.created ? capture.trace : null;
  }

  private activateMcp(runId: string, config: AgentRunConfig, workingDirectory: string, definition: AgentDefinition): AgentToolMcpDescriptor | null {
    const member = config.memberExecutionContext;
    const displayName = member ? getAgentTeamAddressBasename(member.identity.memberAddress) : null;
    const result = this.deps.mcpSessions.activateForRun({
      owner: member ? { runId, collaborationIdentity: member.identity, displayName } : { runId },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: runId, senderName: displayName ?? config.agentDefinitionId,
        runtimeKind: config.runtimeKind, memberExecutionContext: member,
      }),
      runtimeExposure: resolveRuntimeAgentToolExposure(definition, member),
      executionContext: {
        workingDirectory, memoryDir: config.memoryDir,
        applicationExecutionContext: config.applicationExecutionContext,
      },
      runtimeKind: config.runtimeKind,
    });
    return result.kind === "active" ? result.descriptor : null;
  }
}
