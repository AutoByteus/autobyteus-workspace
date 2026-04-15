import { randomUUID } from "node:crypto";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { AgentRunService, getAgentRunService, type CreateAgentRunInput } from "../../agent-execution/services/agent-run-service.js";
import { TeamRunService, getTeamRunService, type CreateTeamRunInput } from "../../agent-team-execution/services/team-run-service.js";
import {
  ApplicationSessionLaunchBuilder,
  type CreateApplicationSessionMemberConfigInput,
} from "./application-session-launch-builder.js";
import {
  getApplicationSessionStreamService,
  type ApplicationSessionStreamService,
} from "../streaming/application-session-stream-service.js";
import type {
  ApplicationSessionBinding,
  ApplicationSessionSnapshot,
} from "../domain/models.js";
import { ApplicationSessionStateStore } from "../stores/application-session-state-store.js";
import { ApplicationPublicationService } from "./application-publication-service.js";

export type CreateApplicationSessionInput = {
  applicationId: string;
  workspaceRootPath?: string | null;
  workspaceId?: string | null;
  llmModelIdentifier?: string | null;
  autoExecuteTools?: boolean;
  llmConfig?: Record<string, unknown> | null;
  skillAccessMode?: SkillAccessMode | null;
  runtimeKind?: string | null;
  memberConfigs?: CreateApplicationSessionMemberConfigInput[] | null;
};

export type SendApplicationInputContextFileInput = {
  uri: string;
  fileType?: ContextFileType | null;
  fileName?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SendApplicationInputInput = {
  applicationSessionId: string;
  text: string;
  targetMemberName?: string | null;
  contextFiles?: SendApplicationInputContextFileInput[] | null;
  metadata?: Record<string, unknown> | null;
};

const requireNonEmptyString = (value: string | null | undefined, fieldName: string): string => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const cloneSession = (snapshot: ApplicationSessionSnapshot): ApplicationSessionSnapshot => structuredClone(snapshot);

export class ApplicationSessionService {
  private static instance: ApplicationSessionService | null = null;

  static getInstance(
    options: ConstructorParameters<typeof ApplicationSessionService>[0] = {},
  ): ApplicationSessionService {
    if (!ApplicationSessionService.instance) {
      ApplicationSessionService.instance = new ApplicationSessionService(options);
    }
    return ApplicationSessionService.instance;
  }

  static resetInstance(): void {
    ApplicationSessionService.instance = null;
  }

  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      agentRunService?: AgentRunService;
      teamRunService?: TeamRunService;
      agentDefinitionService?: AgentDefinitionService;
      agentTeamDefinitionService?: AgentTeamDefinitionService;
      sessionStateStore?: ApplicationSessionStateStore;
      publicationService?: ApplicationPublicationService;
      streamService?: ApplicationSessionStreamService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get agentRunService(): AgentRunService {
    return this.dependencies.agentRunService ?? getAgentRunService();
  }

  private get teamRunService(): TeamRunService {
    return this.dependencies.teamRunService ?? getTeamRunService();
  }

  private get agentDefinitionService(): AgentDefinitionService {
    return this.dependencies.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  private get agentTeamDefinitionService(): AgentTeamDefinitionService {
    return this.dependencies.agentTeamDefinitionService ?? AgentTeamDefinitionService.getInstance();
  }

  private get sessionStateStore(): ApplicationSessionStateStore {
    return this.dependencies.sessionStateStore ?? new ApplicationSessionStateStore();
  }

  private get publicationService(): ApplicationPublicationService {
    return this.dependencies.publicationService ?? new ApplicationPublicationService();
  }

  private get streamService(): ApplicationSessionStreamService {
    return this.dependencies.streamService ?? getApplicationSessionStreamService();
  }

  private get launchBuilder(): ApplicationSessionLaunchBuilder {
    return new ApplicationSessionLaunchBuilder({
      agentDefinitionService: this.agentDefinitionService,
      agentTeamDefinitionService: this.agentTeamDefinitionService,
    });
  }

  async createApplicationSession(input: CreateApplicationSessionInput): Promise<ApplicationSessionSnapshot> {
    const applicationId = requireNonEmptyString(input.applicationId, "applicationId");
    const application = await this.applicationBundleService.getApplicationById(applicationId);
    if (!application) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }

    const existingBinding = await this.sessionStateStore.applicationSessionBinding(applicationId, null);
    if (existingBinding.resolvedSessionId) {
      await this.terminateSession(existingBinding.resolvedSessionId);
    }

    const sessionId = randomUUID();
    const createdAt = new Date().toISOString();

    if (application.runtimeTarget.kind === "AGENT") {
      const memberDescriptor = await this.launchBuilder.buildSingleAgentDescriptor(application);
      const runResult = await this.agentRunService.createAgentRun({
        agentDefinitionId: application.runtimeTarget.definitionId,
        workspaceRootPath: requireNonEmptyString(input.workspaceRootPath, "workspaceRootPath"),
        workspaceId: input.workspaceId ?? null,
        llmModelIdentifier: requireNonEmptyString(input.llmModelIdentifier, "llmModelIdentifier"),
        autoExecuteTools: Boolean(input.autoExecuteTools),
        llmConfig: input.llmConfig ?? null,
        skillAccessMode: input.skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: requireNonEmptyString(input.runtimeKind, "runtimeKind"),
        applicationSessionContext: this.launchBuilder.buildLaunchContext(
          sessionId,
          applicationId,
          memberDescriptor,
        ),
      } satisfies CreateAgentRunInput);

      const snapshot = this.launchBuilder.createSnapshot({
        application,
        applicationSessionId: sessionId,
        createdAt,
        runtime: {
          kind: "AGENT",
          runId: runResult.runId,
          definitionId: application.runtimeTarget.definitionId,
        },
        members: [
          {
            ...memberDescriptor,
            runId: runResult.runId,
          },
        ],
      });

      return this.persistLiveSession(snapshot);
    }

    const memberDescriptors = await this.launchBuilder.buildTeamMemberDescriptors(
      application.runtimeTarget.definitionId,
    );
    const memberConfigs = this.launchBuilder.normalizeTeamMemberConfigs(
      input.memberConfigs,
      memberDescriptors,
    );
    const run = await this.teamRunService.createTeamRun({
      teamDefinitionId: application.runtimeTarget.definitionId,
      memberConfigs: memberConfigs.map((memberConfig) => {
        const descriptor = memberDescriptors.find(
          (entry) => entry.memberRouteKey === normalizeMemberRouteKey(memberConfig.memberRouteKey ?? memberConfig.memberName),
        );
        if (!descriptor) {
          throw new Error(`Application member '${memberConfig.memberName}' is not part of the bound team.`);
        }
        return {
          ...memberConfig,
          applicationSessionContext: this.launchBuilder.buildLaunchContext(
            sessionId,
            applicationId,
            descriptor,
          ),
        };
      }),
    } satisfies CreateTeamRunInput);

    const runMemberConfigs = run.config?.memberConfigs ?? [];
    const snapshot = this.launchBuilder.createSnapshot({
      application,
      applicationSessionId: sessionId,
      createdAt,
      runtime: {
        kind: "AGENT_TEAM",
        runId: run.runId,
        definitionId: application.runtimeTarget.definitionId,
      },
      members: memberDescriptors.map((descriptor) => {
        const runMember = runMemberConfigs.find(
          (entry) => normalizeMemberRouteKey(entry.memberRouteKey ?? entry.memberName) === descriptor.memberRouteKey,
        );
        return {
          ...descriptor,
          runId: runMember?.memberRunId ?? run.runId,
        };
      }),
    });

    return this.persistLiveSession(snapshot);
  }

  async getSessionById(applicationSessionId: string): Promise<ApplicationSessionSnapshot | null> {
    const applicationIds = await this.listApplicationIds();
    const session = await this.sessionStateStore.findSessionById(applicationIds, applicationSessionId);
    return session ? cloneSession(session) : null;
  }

  async applicationSessionBinding(
    applicationId: string,
    requestedSessionId?: string | null,
  ): Promise<ApplicationSessionBinding> {
    const normalizedApplicationId = requireNonEmptyString(applicationId, "applicationId");
    return this.sessionStateStore.applicationSessionBinding(
      normalizedApplicationId,
      requestedSessionId ?? null,
    );
  }

  async terminateSession(applicationSessionId: string): Promise<ApplicationSessionSnapshot | null> {
    const session = await this.getSessionById(applicationSessionId);
    if (!session || session.terminatedAt) {
      return session ? cloneSession(session) : null;
    }

    if (session.runtime.kind === "AGENT") {
      await this.agentRunService.terminateAgentRun(session.runtime.runId);
    } else {
      await this.teamRunService.terminateTeamRun(session.runtime.runId);
    }

    const terminated = {
      ...session,
      terminatedAt: new Date().toISOString(),
    } satisfies ApplicationSessionSnapshot;
    const persisted = await this.sessionStateStore.persistSessionUpdate(terminated);
    this.streamService.publish(persisted);
    await this.publicationService.recordSessionTerminated(persisted);
    return cloneSession(persisted);
  }

  async sendInput(input: SendApplicationInputInput): Promise<ApplicationSessionSnapshot> {
    const session = await this.requireLiveSession(input.applicationSessionId);
    const message = new AgentInputUserMessage(
      requireNonEmptyString(input.text, "text"),
      SenderType.USER,
      (input.contextFiles ?? []).map(
        (contextFile) =>
          new ContextFile(
            requireNonEmptyString(contextFile.uri, "contextFiles[].uri"),
            contextFile.fileType ?? undefined,
            contextFile.fileName ?? null,
            contextFile.metadata ?? {},
          ),
      ),
      input.metadata ?? {},
    );

    if (session.runtime.kind === "AGENT") {
      const run = await this.agentRunService.resolveAgentRun(session.runtime.runId);
      if (!run) {
        throw new Error(`Application runtime '${session.runtime.runId}' is not available.`);
      }
      const result = await run.postUserMessage(message);
      if (!result.accepted) {
        throw new Error(result.message ?? "Application runtime rejected the input.");
      }
      return cloneSession(session);
    }

    const run = await this.teamRunService.resolveTeamRun(session.runtime.runId);
    if (!run) {
      throw new Error(`Application runtime '${session.runtime.runId}' is not available.`);
    }
    const result = await run.postMessage(message, input.targetMemberName?.trim() || null);
    if (!result.accepted) {
      throw new Error(result.message ?? "Application runtime rejected the input.");
    }
    return cloneSession(session);
  }

  async publishFromRuntime(input: {
    runId: string;
    customData?: Record<string, unknown> | null;
    publication: unknown;
  }): Promise<ApplicationSessionSnapshot> {
    return this.publicationService.appendRuntimePublication(input);
  }

  private async persistLiveSession(snapshot: ApplicationSessionSnapshot): Promise<ApplicationSessionSnapshot> {
    const persisted = await this.sessionStateStore.persistLiveSession(snapshot);
    this.streamService.publish(persisted);
    await this.publicationService.recordSessionStarted(persisted);
    return cloneSession(persisted);
  }

  private async requireLiveSession(applicationSessionId: string): Promise<ApplicationSessionSnapshot> {
    const normalized = requireNonEmptyString(applicationSessionId, "applicationSessionId");
    const session = await this.getSessionById(normalized);
    if (!session || session.terminatedAt !== null) {
      throw new Error(`Application session '${normalized}' is not live.`);
    }
    return session;
  }

  private async listApplicationIds(): Promise<string[]> {
    const applications = await this.applicationBundleService.listApplications();
    return applications.map((application) => application.id);
  }
}

let cachedApplicationSessionService: ApplicationSessionService | null = null;

export const getApplicationSessionService = (): ApplicationSessionService => {
  if (!cachedApplicationSessionService) {
    cachedApplicationSessionService = ApplicationSessionService.getInstance();
  }
  return cachedApplicationSessionService;
};
