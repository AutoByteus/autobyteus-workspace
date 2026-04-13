import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ApplicationSessionService } from "../../../src/application-sessions/services/application-session-service.js";
import { APPLICATION_SESSION_CONTEXT_KEY } from "../../../src/application-sessions/utils/application-producer-provenance.js";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";

const applicationBundle: ApplicationBundle = {
  id: "bundle-app__pkg__sample-app",
  localApplicationId: "sample-app",
  packageId: "pkg",
  name: "Sample App",
  description: "Sample application",
  iconAssetPath: null,
  entryHtmlAssetPath: "application-bundles/sample-app/assets/ui/index.html",
  runtimeTarget: {
    kind: "AGENT",
    localId: "sample-agent",
    definitionId: "agent-def-1",
  },
  writable: true,
  applicationRootPath: "/tmp/sample-app",
  packageRootPath: "/tmp",
  localAgentIds: ["sample-agent"],
  localTeamIds: [],
  entryHtmlRelativePath: "ui/index.html",
  iconRelativePath: null,
};

const createSubject = () => {
  const applicationBundleService = {
    getApplicationById: vi.fn().mockResolvedValue(applicationBundle),
  };
  const agentRunService = {
    createAgentRun: vi.fn().mockResolvedValue({
      runId: "agent-run-1",
    }),
    terminateAgentRun: vi.fn().mockResolvedValue(true),
  };
  const teamRunService = {
    createTeamRun: vi.fn(),
    terminateTeamRun: vi.fn(),
  };
  const agentDefinitionService = {
    getAgentDefinitionById: vi.fn().mockResolvedValue({
      id: "agent-def-1",
      name: "Sample Agent",
    }),
  };
  const agentTeamDefinitionService = {
    getDefinitionById: vi.fn(),
  };
  const streamService = {
    publish: vi.fn(),
  };

  const service = new ApplicationSessionService({
    applicationBundleService: applicationBundleService as never,
    agentRunService: agentRunService as never,
    teamRunService: teamRunService as never,
    agentDefinitionService: agentDefinitionService as never,
    agentTeamDefinitionService: agentTeamDefinitionService as never,
    streamService: streamService as never,
  });

  return {
    service,
    mocks: {
      applicationBundleService,
      agentRunService,
      streamService,
    },
  };
};

const buildRuntimeCustomData = (
  session: Awaited<ReturnType<ApplicationSessionService["createApplicationSession"]>>,
) => {
  const member = session.view.members[0];
  if (!member?.runtimeTarget) {
    throw new Error("Expected session member runtime target.");
  }

  return {
    [APPLICATION_SESSION_CONTEXT_KEY]: {
      applicationSessionId: session.applicationSessionId,
      applicationId: session.application.applicationId,
      member: {
        memberRouteKey: member.memberRouteKey,
        displayName: member.displayName,
        teamPath: [...member.teamPath],
        runtimeKind: member.runtimeTarget.runtimeKind,
      },
    },
  };
};

describe("ApplicationSessionService.applicationSessionBinding", () => {
  it("returns requested_live when the requested session is still live for the application", async () => {
    const { service } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    const binding = await service.applicationSessionBinding(
      applicationBundle.id,
      session.applicationSessionId,
    );

    expect(binding).toMatchObject({
      applicationId: applicationBundle.id,
      requestedSessionId: session.applicationSessionId,
      resolvedSessionId: session.applicationSessionId,
      resolution: "requested_live",
    });
    expect(binding.session?.applicationSessionId).toBe(session.applicationSessionId);
  });

  it("returns application_active when the requested session is missing but the application still has a live active session", async () => {
    const { service } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    const binding = await service.applicationSessionBinding(
      applicationBundle.id,
      "missing-session-id",
    );

    expect(binding).toMatchObject({
      applicationId: applicationBundle.id,
      requestedSessionId: "missing-session-id",
      resolvedSessionId: session.applicationSessionId,
      resolution: "application_active",
    });
    expect(binding.session?.applicationSessionId).toBe(session.applicationSessionId);
  });

  it("returns none when no live session remains for the application", async () => {
    const { service, mocks } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    await service.terminateSession(session.applicationSessionId);
    const binding = await service.applicationSessionBinding(
      applicationBundle.id,
      session.applicationSessionId,
    );

    expect(mocks.agentRunService.terminateAgentRun).toHaveBeenCalledWith("agent-run-1");
    expect(binding).toEqual({
      applicationId: applicationBundle.id,
      requestedSessionId: session.applicationSessionId,
      resolvedSessionId: null,
      resolution: "none",
      session: null,
    });
  });

  it("rejects unsupported publication families without mutating session state", async () => {
    const { service, mocks } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    const before = service.getSessionById(session.applicationSessionId);
    const publishCountBefore = mocks.streamService.publish.mock.calls.length;

    await expect(service.publishFromRuntime({
      runId: session.runtime.runId,
      customData: buildRuntimeCustomData(session),
      publication: {
        contractVersion: "1",
        publicationFamily: "NOT_A_REAL_FAMILY",
        publicationKey: "invalid-publication",
      },
    })).rejects.toThrow("Unsupported publish_application_event publicationFamily");

    expect(service.getSessionById(session.applicationSessionId)).toEqual(before);
    expect(mocks.streamService.publish).toHaveBeenCalledTimes(publishCountBefore);
  });

  it("rejects disallowed fields for the declared family without mutating session state", async () => {
    const { service, mocks } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    const before = service.getSessionById(session.applicationSessionId);
    const publishCountBefore = mocks.streamService.publish.mock.calls.length;

    await expect(service.publishFromRuntime({
      runId: session.runtime.runId,
      customData: buildRuntimeCustomData(session),
      publication: {
        contractVersion: "1",
        publicationFamily: "PROGRESS",
        publicationKey: "drafting",
        phaseLabel: "Drafting",
        state: "working",
        artifactType: "markdown_document",
      },
    })).rejects.toThrow("publish_application_event v1 disallows fields for PROGRESS: artifactType.");

    expect(service.getSessionById(session.applicationSessionId)).toEqual(before);
    expect(mocks.streamService.publish).toHaveBeenCalledTimes(publishCountBefore);
  });

  it("rejects metadata escape hatches without mutating session state", async () => {
    const { service, mocks } = createSubject();
    const session = await service.createApplicationSession({
      applicationId: applicationBundle.id,
      workspaceRootPath: "/tmp/workspace",
      workspaceId: "workspace-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    const before = service.getSessionById(session.applicationSessionId);
    const publishCountBefore = mocks.streamService.publish.mock.calls.length;

    await expect(service.publishFromRuntime({
      runId: session.runtime.runId,
      customData: buildRuntimeCustomData(session),
      publication: {
        contractVersion: "1",
        publicationFamily: "PROGRESS",
        publicationKey: "drafting",
        phaseLabel: "Drafting",
        state: "working",
        metadata: { leaked: true },
      },
    })).rejects.toThrow("publish_application_event v1 does not allow metadata.");

    expect(service.getSessionById(session.applicationSessionId)).toEqual(before);
    expect(mocks.streamService.publish).toHaveBeenCalledTimes(publishCountBefore);
  });
});
