import type { IntegrationRunAccess } from "../../../../credential-proxy/integration-run-access.js";
import { workspaceCollisionPolicyForScope } from "../../shared/workspace-skill-collision-policy.js";
import type { SystemInstructionTraceRecord } from "autobyteus-ts";
import { createBackendPreparation, type AgentRunBackendPreparation } from "../../agent-run-backend-preparation.js";
import type { AgentRunBackendPreparationRequest } from "../../agent-run-backend-factory.js";
import type { AgentRunBackendFactory } from "../../agent-run-backend-factory.js";
import type { AgentRunConfig } from "../../../domain/agent-run-config.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import { AgentCreationError } from "../../../errors.js";
import type { AgentDefinitionService } from "../../../../agent-definition/services/agent-definition-service.js";
import type { SkillService } from "../../../../skills/services/skill-service.js";
import type {
  AgentToolMcpRunSessionActivator,
  AgentToolMcpRunSessionExposure,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import {
  getSystemInstructionCaptureService,
  type SystemInstructionCaptureService,
} from "../../../../agent-memory/services/system-instruction-capture-service.js";
import { resolveRuntimeAgentToolExposure, type RuntimeAgentToolExposure } from "../../../shared/runtime-agent-tool-exposure.js";
import { composeSharedCarpenterPrompt } from "../../../prompt/carpenter-prompt-composer.js";
import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { MaterializedWorkspaceSkill, WorkspaceSkillMaterializer } from "../../shared/workspace-skill-materializer.js";
import type { AcpAgentLaunchProfile } from "../../../../runtime-management/acp/acp-agent-launch-profile.js";
import type { AcpAgentSessionProfile } from "../acp-agent-session-profile.js";
import { AcpAgentRunBackend } from "./acp-agent-run-backend.js";
import {
  AcpSessionEventSink,
  AcpSessionLauncher,
  type AcpPreparationOwner,
} from "../session/acp-session-launcher.js";
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
  mcpSessions: AgentToolMcpRunSessionActivator & AgentToolMcpRunSessionExposure;
  skillMaterializer: WorkspaceSkillMaterializer;
  instructionCapture?: SystemInstructionCaptureService;
  /** The run's integration variables for the agent process (`null`: none on this host). */
  integrationRunAccess: IntegrationRunAccess | null;
}>;

type PreparedRun = Readonly<{
  workingDirectory: string;
  definition: AgentDefinition;
  exposure: RuntimeAgentToolExposure;
  descriptor: AgentToolMcpDescriptor;
  materializedSkills: MaterializedWorkspaceSkill[];
}>;

/**
 * Create/restore sequencing for any ACP agent, parameterized by its launch and session
 * profiles. Acquires workspace, skills, Agent Tools MCP, one agent process and one session;
 * on failure it stops the process and releases the skills it acquired. Agent JSON-RPC errors
 * and safe ACP errors surface as `AgentCreationError` so the caller shows the agent's text.
 */
export class AcpAgentRunBackendFactory implements AgentRunBackendFactory {
  constructor(private readonly deps: AcpAgentRunBackendFactoryDependencies) {
    this.launcher = new AcpSessionLauncher({
      launchProfile: deps.launchProfile, sessionProfile: deps.sessionProfile, integrationRunAccess: deps.integrationRunAccess,
    });
  }

  beginPreparation(request: AgentRunBackendPreparationRequest): AgentRunBackendPreparation {
    const owner: AcpPreparationOwner = { process: null, connection: null, session: null, skills: [] };
    const operation = createBackendPreparation({
      prepare: (assertAccepting) => request.kind === "new"
        ? this.createBackend(request.config, request.runId, owner, assertAccepting, release)
        : this.restoreBackend(request.context, owner, assertAccepting, release),
      releaseResources: async () => {
        const errors: unknown[] = [];
        try { owner.session?.close(); } catch (error) { errors.push(error); }
        try {
          if (owner.connection) await owner.connection.close();
          else await owner.process?.stop();
        } catch (error) { errors.push(error); }
        try { await this.deps.skillMaterializer.cleanupMaterializedWorkspaceSkills(owner.skills); }
        catch (error) { errors.push(error); }
        if (errors.length) throw new AggregateError(errors, "ACP exact preparation release failed.");
      },
    });
    const release = async () => {
      const result = await operation.release();
      if (result.kind !== "released") throw result.kind === "failed" ? result.error : new Error("ACP release still has pending acquisition.");
    };
    return operation;
  }

  private readonly launcher: AcpSessionLauncher;

  private async createBackend(config: AgentRunConfig, runId: string, owner: AcpPreparationOwner, assertAccepting: () => void, release: () => Promise<void>): Promise<AcpAgentRunBackend> {
    const prepared = await this.prepare(config, runId, owner, assertAccepting);
    const composedPrompt = composeSharedCarpenterPrompt({
      agentDefinition: prepared.definition, memberExecutionContext: config.memberExecutionContext, project: config.project,
    });
    const sink = new AcpSessionEventSink();
    const suppliedAt = Date.now() / 1000;
    const opened = await this.launcher.open({
      owner, runId, config, workingDirectory: prepared.workingDirectory, descriptor: prepared.descriptor,
      sink, assertAccepting, mode: "new",
      newSessionMeta: this.deps.sessionProfile.newSessionMeta({ composedPrompt, autoExecuteTools: config.autoExecuteTools }),
    });
    const trace = this.captureInstructions(config, composedPrompt, suppliedAt);
    return this.bindBackend(config, runId, prepared, opened.sessionId, trace, owner, sink, release);
  }

  private async restoreBackend(context: AgentRunContext<RuntimeAgentRunContext>, owner: AcpPreparationOwner, assertAccepting: () => void, release: () => Promise<void>): Promise<AcpAgentRunBackend> {
    const sessionId = context.runtimeContext instanceof AcpAgentRunContext ? context.runtimeContext.sessionId : null;
    if (!sessionId || sessionId === context.runId) {
      throw new AgentCreationError(`PLATFORM_AGENT_RUN_BINDING_INVALID: ${this.deps.launchProfile.agentLabel} restore requires the exact session id.`);
    }
    const prepared = await this.prepare(context.config, context.runId, owner, assertAccepting);
    const sink = new AcpSessionEventSink();
    // The agent keeps the run-start instructions; they are not re-sent on load.
    await this.launcher.open({
      owner, runId: context.runId, config: context.config, workingDirectory: prepared.workingDirectory,
      descriptor: prepared.descriptor, sink, assertAccepting, mode: "load", sessionId,
    });
    return this.bindBackend(context.config, context.runId, prepared, sessionId, null, owner, sink, release);
  }

  private async prepare(config: AgentRunConfig, runId: string, owner: AcpPreparationOwner, assertAccepting: () => void): Promise<PreparedRun> {
    const workingDirectory = await this.deps.workspaces.resolveWorkingDirectory(config.workspaceId);
    const definition = await this.deps.definitions.getAgentDefinitionById(config.agentDefinitionId);
    if (!definition) throw new Error(`ACP_AGENT_DEFINITION_MISSING: ${config.agentDefinitionId}`);
    const bindings = this.deps.skills.resolveConfiguredSkillBindingsForAgent(definition);
    const { materializedSkills } = await this.deps.skillMaterializer.materializeConfiguredWorkspaceSkills({
      runId, workingDirectory,
      onAcquired: (skill) => { owner.skills.push(skill); }, assertAccepting,
      workspaceCollisionPolicy: workspaceCollisionPolicyForScope(this.deps.skills.resolveSkillScope(definition)),
      requests: bindings.map((binding) => binding.kind === "resolved"
        ? { kind: "expose-resolved" as const, skill: binding.skill }
        : { kind: "reconcile-unresolved" as const, name: binding.name }),
    });
    assertAccepting();
    const exposure = resolveRuntimeAgentToolExposure(definition, config.memberExecutionContext);
    const descriptor = this.activateMcp(runId, config, workingDirectory, exposure);
    return { workingDirectory, definition, exposure, descriptor, materializedSkills };
  }

  /** The run's backend over what the owner holds; the session's output goes to it from now on. */
  private bindBackend(
    config: AgentRunConfig,
    runId: string,
    prepared: PreparedRun,
    sessionId: string,
    trace: SystemInstructionTraceRecord | null,
    owner: AcpPreparationOwner,
    sink: AcpSessionEventSink,
    release: () => Promise<void>,
  ): AcpAgentRunBackend {
    const backend = new AcpAgentRunBackend({
      context: new AgentRunContext({
        runId, config, runtimeContext: new AcpAgentRunContext(sessionId, prepared.workingDirectory),
      }),
      workingDirectory: prepared.workingDirectory,
      owner, sink, launcher: this.launcher,
      agentTools: { runSessions: this.deps.mcpSessions, exposure: prepared.exposure, openedToolNames: prepared.descriptor.enabledTools },
      pendingSystemInstruction: trace, cleanup: release,
    });
    sink.bind(backend);
    if (owner.session?.state === "failed") {
      throw new AgentCreationError(`ACP_SESSION_FAILED: ${this.deps.launchProfile.agentLabel} stopped during activation.`);
    }
    return backend;
  }

  private captureInstructions(config: AgentRunConfig, content: string, suppliedAt: number): SystemInstructionTraceRecord | null {
    if (!config.memoryDir) return null;
    const capture = (this.deps.instructionCapture ?? getSystemInstructionCaptureService())
      .capture({ memoryDir: config.memoryDir, content, suppliedAt });
    return capture.created ? capture.trace : null;
  }

  private activateMcp(runId: string, config: AgentRunConfig, workingDirectory: string, exposure: RuntimeAgentToolExposure): AgentToolMcpDescriptor {
    const member = config.memberExecutionContext;
    const displayName = member ? getAgentTeamAddressBasename(member.identity.memberAddress) : null;
    const result = this.deps.mcpSessions.activateForRun({
      owner: member ? { runId, collaborationIdentity: member.identity, displayName } : { runId },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: runId, senderName: displayName ?? config.agentDefinitionId,
        runtimeKind: config.runtimeKind, memberExecutionContext: member,
      }),
      runtimeExposure: exposure,
      executionContext: {
        workingDirectory, memoryDir: config.memoryDir,
        applicationExecutionContext: config.applicationExecutionContext,
      },
      runtimeKind: config.runtimeKind,
    });
    return result.descriptor;
  }
}
