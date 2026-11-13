import type { IntegrationRunAccess } from "../../../../credential-proxy/integration-run-access.js";
import type { ProviderRelayAccess } from "../../../../credential-proxy/provider-relays/provider-relay-access.js";
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
import { getAgentSemanticMemory, type AgentSemanticMemory } from "../../../../agent-memory/services/agent-semantic-memory.js";
import { buildAgentRunMessageSenderContext } from "../../../../agent-communication/domain/agent-run-message-sender.js";
import { getAgentTeamAddressBasename } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { WorkspaceSkillMaterializer } from "../../shared/workspace-skill-materializer.js";
import {
  exposedWorkspaceSkillRequests,
  planExposedWorkspaceSkillRequests,
  RunWorkspaceSkills,
} from "../../shared/run-workspace-skills.js";
import type { AcpAgentLaunchProfile } from "../../../../runtime-management/acp/acp-agent-launch-profile.js";
import type { AcpAgentSessionProfile } from "../acp-agent-session-profile.js";
import { AcpAgentRunBackend } from "./acp-agent-run-backend.js";
import {
  AcpSessionEventSink,
  AcpSessionLauncher,
  createAcpPreparationOwner,
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
  /** The agents' semantic memory folders; the process instance by default. */
  semanticMemory?: AgentSemanticMemory;
  /** The run's integration variables for the agent process (`null`: none on this host). */
  integrationRunAccess: IntegrationRunAccess | null;
  /** The runs' provider relay access (`null`: this host runs no credential proxy). */
  providerRelayAccess: ProviderRelayAccess | null;
}>;

/** What one run's preparation holds: its launch generation (`owner`) and its workspace skill links. */
type AcpRunHolders = Readonly<{ owner: AcpPreparationOwner; workspaceSkills: RunWorkspaceSkills }>;

type PreparedRun = Readonly<{
  workingDirectory: string;
  definition: AgentDefinition;
  semanticMemoryPath: string | null;
  exposure: RuntimeAgentToolExposure;
  descriptor: AgentToolMcpDescriptor;
}>;

/**
 * Create/restore sequencing for any ACP agent, parameterized by its launch and session
 * profiles. Acquires workspace, skills, Agent Tools MCP, composes the run's instructions (for
 * every launch), then one agent process and one session; on failure or release it ends what
 * the owner holds (`AcpSessionLauncher.end`) and releases the run's skill links (`RunWorkspaceSkills.release`). Agent
 * JSON-RPC errors and safe ACP errors surface as `AgentCreationError` so the caller shows the
 * agent's text.
 */
export class AcpAgentRunBackendFactory implements AgentRunBackendFactory {
  constructor(private readonly deps: AcpAgentRunBackendFactoryDependencies) {
    this.launcher = new AcpSessionLauncher({
      launchProfile: deps.launchProfile, sessionProfile: deps.sessionProfile,
      integrationRunAccess: deps.integrationRunAccess, providerRelayAccess: deps.providerRelayAccess,
    });
  }

  beginPreparation(request: AgentRunBackendPreparationRequest): AgentRunBackendPreparation {
    const owner = createAcpPreparationOwner();
    const workspaceSkills = new RunWorkspaceSkills({
      runId: request.kind === "new" ? request.runId : request.context.runId,
      materializer: this.deps.skillMaterializer,
      skillService: this.deps.skills,
      planRequests: planExposedWorkspaceSkillRequests,
    });
    const run = { owner, workspaceSkills };
    const operation = createBackendPreparation({
      prepare: (assertAccepting) => request.kind === "new"
        ? this.createBackend(request.config, request.runId, run, assertAccepting, release)
        : this.restoreBackend(request.context, run, assertAccepting, release),
      releaseResources: async () => {
        const errors: unknown[] = [];
        try { await AcpSessionLauncher.end(owner); } catch (error) { errors.push(error); }
        try { await workspaceSkills.release(); } catch (error) { errors.push(error); }
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

  private async createBackend(config: AgentRunConfig, runId: string, run: AcpRunHolders, assertAccepting: () => void, release: () => Promise<void>): Promise<AcpAgentRunBackend> {
    const { owner } = run;
    const prepared = await this.prepare(config, runId, run.workspaceSkills, assertAccepting);
    const instructions = this.composeInstructions(prepared, config);
    const sink = new AcpSessionEventSink();
    const suppliedAt = Date.now() / 1000;
    const opened = await this.launcher.open({
      owner, runId, config, workingDirectory: prepared.workingDirectory, descriptor: prepared.descriptor,
      sink, assertAccepting, instructions, mode: "new",
    });
    const trace = this.captureInstructions(config, instructions, suppliedAt);
    return this.bindBackend(config, runId, prepared, opened.sessionId, instructions, trace, run, sink, release);
  }

  private async restoreBackend(context: AgentRunContext<RuntimeAgentRunContext>, run: AcpRunHolders, assertAccepting: () => void, release: () => Promise<void>): Promise<AcpAgentRunBackend> {
    const { owner } = run;
    const sessionId = context.runtimeContext instanceof AcpAgentRunContext ? context.runtimeContext.sessionId : null;
    if (!sessionId || sessionId === context.runId) {
      throw new AgentCreationError(`PLATFORM_AGENT_RUN_BINDING_INVALID: ${this.deps.launchProfile.agentLabel} restore requires the exact session id.`);
    }
    const prepared = await this.prepare(context.config, context.runId, run.workspaceSkills, assertAccepting);
    // Composed from the current definition, as at creation: a launch whose agent does not keep them needs them again.
    const instructions = this.composeInstructions(prepared, context.config);
    const sink = new AcpSessionEventSink();
    await this.launcher.open({
      owner, runId: context.runId, config: context.config, workingDirectory: prepared.workingDirectory,
      descriptor: prepared.descriptor, sink, assertAccepting, instructions, mode: "restore", sessionId,
    });
    return this.bindBackend(context.config, context.runId, prepared, sessionId, instructions, null, run, sink, release);
  }

  private composeInstructions(prepared: PreparedRun, config: AgentRunConfig): string {
    return composeSharedCarpenterPrompt({
      agentDefinition: prepared.definition, memberExecutionContext: config.memberExecutionContext, project: config.project,
      semanticMemoryPath: prepared.semanticMemoryPath,
    });
  }

  private async prepare(config: AgentRunConfig, runId: string, workspaceSkills: RunWorkspaceSkills, assertAccepting: () => void): Promise<PreparedRun> {
    const workingDirectory = await this.deps.workspaces.resolveWorkingDirectory(config.workspaceId);
    const definition = await this.deps.definitions.getAgentDefinitionById(config.agentDefinitionId);
    if (!definition) throw new Error(`ACP_AGENT_DEFINITION_MISSING: ${config.agentDefinitionId}`);
    const semanticMemoryPath = await (this.deps.semanticMemory ?? getAgentSemanticMemory()).prepareForRun(definition);
    const bindings = this.deps.skills.resolveConfiguredSkillBindingsForAgent(definition);
    await workspaceSkills.acquire({
      workingDirectory,
      requests: exposedWorkspaceSkillRequests(bindings),
      workspaceCollisionPolicy: workspaceCollisionPolicyForScope(this.deps.skills.resolveSkillScope(definition)),
      assertPreparing: assertAccepting,
    });
    assertAccepting();
    const exposure = resolveRuntimeAgentToolExposure(definition, config.memberExecutionContext);
    const descriptor = this.activateMcp(runId, config, workingDirectory, exposure);
    return { workingDirectory, definition, semanticMemoryPath, exposure, descriptor };
  }

  /** The run's backend over what the owner holds; the session's output goes to it from now on. */
  private bindBackend(
    config: AgentRunConfig,
    runId: string,
    prepared: PreparedRun,
    sessionId: string,
    instructions: string,
    trace: SystemInstructionTraceRecord | null,
    run: AcpRunHolders,
    sink: AcpSessionEventSink,
    release: () => Promise<void>,
  ): AcpAgentRunBackend {
    const backend = new AcpAgentRunBackend({
      context: new AgentRunContext({
        runId, config, runtimeContext: new AcpAgentRunContext(sessionId, prepared.workingDirectory),
      }),
      workingDirectory: prepared.workingDirectory,
      instructions,
      owner: run.owner, workspaceSkills: run.workspaceSkills, sink, launcher: this.launcher,
      agentTools: { runSessions: this.deps.mcpSessions, exposure: prepared.exposure, openedToolNames: prepared.descriptor.enabledTools },
      pendingSystemInstruction: trace, cleanup: release,
    });
    sink.bind(backend);
    if (run.owner.session?.state === "failed") {
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
