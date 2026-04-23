import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { ApplicationPublishedArtifactRelayService } from "../../../src/application-orchestration/services/application-published-artifact-relay-service.js";

describe("ApplicationPublishedArtifactRelayService", () => {
  it("relays live ARTIFACT_PERSISTED events from a bound run into the app artifact handler", async () => {
    const listeners = new Set<(event: unknown) => void>();
    const run = {
      runId: "run-1",
      config: {
        applicationExecutionContext: {
          applicationId: "app-1",
          bindingId: "binding-1",
          producer: {
            runId: "run-1",
            memberRouteKey: "writer",
            memberName: "writer",
            displayName: "Writer",
            runtimeKind: "AGENT_TEAM_MEMBER",
            teamPath: [],
          },
        },
      },
      subscribeToEvents(listener: (event: unknown) => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as any;

    const bindingStore = {
      getBinding: vi.fn().mockResolvedValue({
        bindingId: "binding-1",
        applicationId: "app-1",
        bindingIntentId: "intent-1",
        status: "ATTACHED",
        resourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "brief-studio-team",
        },
        runtime: {
          subject: "TEAM_RUN",
          runId: "team-run-1",
          definitionId: "team-def-1",
          members: [
            {
              memberName: "writer",
              memberRouteKey: "writer",
              displayName: "Writer",
              teamPath: [],
              runId: "run-1",
              runtimeKind: "AGENT_TEAM_MEMBER",
            },
          ],
        },
        createdAt: "2026-04-22T08:00:00.000Z",
        updatedAt: "2026-04-22T08:00:00.000Z",
        terminatedAt: null,
        lastErrorMessage: null,
      }),
    };
    const engineHostService = {
      invokeApplicationArtifactHandler: vi.fn().mockResolvedValue({ status: "acknowledged" }),
    };
    const service = new ApplicationPublishedArtifactRelayService({
      bindingStore: bindingStore as any,
      engineHostService: engineHostService as any,
    });

    service.attachToRun(run);

    for (const listener of listeners) {
      listener({
        eventType: AgentRunEventType.ARTIFACT_PERSISTED,
        runId: "run-1",
        statusHint: null,
        payload: {
          id: "run-1:brief-studio/final-brief.md",
          runId: "run-1",
          path: "brief-studio/final-brief.md",
          type: "file",
          status: "available",
          description: "Ready for review",
          revisionId: "revision-1",
          createdAt: "2026-04-22T08:10:00.000Z",
          updatedAt: "2026-04-22T08:10:00.000Z",
        },
      });
    }

    await vi.waitFor(() => {
      expect(engineHostService.invokeApplicationArtifactHandler).toHaveBeenCalledWith("app-1", {
        event: {
          runId: "run-1",
          artifactId: "run-1:brief-studio/final-brief.md",
          revisionId: "revision-1",
          path: "brief-studio/final-brief.md",
          description: "Ready for review",
          fileKind: "file",
          publishedAt: "2026-04-22T08:10:00.000Z",
          binding: expect.objectContaining({
            bindingId: "binding-1",
            applicationId: "app-1",
          }),
          producer: {
            runId: "run-1",
            memberRouteKey: "writer",
            memberName: "writer",
            displayName: "Writer",
            runtimeKind: "AGENT_TEAM_MEMBER",
            teamPath: [],
          },
        },
      });
    });
  });

  it("relays a published artifact directly from a team-member runtime context without a standalone run wrapper", async () => {
    const bindingStore = {
      getBinding: vi.fn().mockResolvedValue({
        bindingId: "binding-1",
        applicationId: "app-1",
        bindingIntentId: "intent-1",
        status: "ATTACHED",
        resourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "brief-studio-team",
        },
        runtime: {
          subject: "TEAM_RUN",
          runId: "team-run-1",
          definitionId: "team-def-1",
          members: [
            {
              memberName: "researcher",
              memberRouteKey: "researcher",
              displayName: "Researcher",
              teamPath: [],
              runId: "researcher_member_run",
              runtimeKind: "AGENT_TEAM_MEMBER",
            },
          ],
        },
        createdAt: "2026-04-22T08:00:00.000Z",
        updatedAt: "2026-04-22T08:00:00.000Z",
        terminatedAt: null,
        lastErrorMessage: null,
      }),
    };
    const engineHostService = {
      invokeApplicationArtifactHandler: vi.fn().mockResolvedValue({ status: "acknowledged" }),
    };
    const service = new ApplicationPublishedArtifactRelayService({
      bindingStore: bindingStore as any,
      engineHostService: engineHostService as any,
    });

    await service.relayArtifactForExecutionContext({
      runId: "researcher_member_run",
      applicationExecutionContext: {
        applicationId: "app-1",
        bindingId: "binding-1",
        producer: {
          runId: "team-run-1",
          memberRouteKey: "researcher",
          memberName: "researcher",
          displayName: "Researcher",
          runtimeKind: "AGENT_TEAM_MEMBER",
          teamPath: [],
        },
      },
      artifact: {
        id: "researcher_member_run:brief-studio/research.md",
        runId: "researcher_member_run",
        path: "brief-studio/research.md",
        type: "file",
        status: "available",
        description: "Research checkpoint",
        revisionId: "revision-1",
        createdAt: "2026-04-22T08:10:00.000Z",
        updatedAt: "2026-04-22T08:10:00.000Z",
      },
    });

    expect(engineHostService.invokeApplicationArtifactHandler).toHaveBeenCalledWith("app-1", {
      event: {
        runId: "researcher_member_run",
        artifactId: "researcher_member_run:brief-studio/research.md",
        revisionId: "revision-1",
        path: "brief-studio/research.md",
        description: "Research checkpoint",
        fileKind: "file",
        publishedAt: "2026-04-22T08:10:00.000Z",
        binding: expect.objectContaining({
          bindingId: "binding-1",
          applicationId: "app-1",
        }),
        producer: {
          runId: "team-run-1",
          memberRouteKey: "researcher",
          memberName: "researcher",
          displayName: "Researcher",
          runtimeKind: "AGENT_TEAM_MEMBER",
          teamPath: [],
        },
      },
    });
  });
});
