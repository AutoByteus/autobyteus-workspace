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
            agentRunId: "run-1",
            displayName: "Writer",
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
        launchRequestId: "intent-1",
        status: "ATTACHED",
        executionResourceRef: {
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: "brief-studio-team",
        },
        runtime: {
          subject: "TEAM_RUN",
          teamRunId: "team-run-1",
          definitionId: "team-def-1",
          members: [
            {
              memberAddress: "/writer",
              displayName: "Writer",
              agentRunId: "run-1",
            },
          ],
        },
        createdAt: "2026-04-22T08:00:00.000Z",
        updatedAt: "2026-04-22T08:00:00.000Z",
        terminatedAt: null,
        lastErrorMessage: null,
      }),
    };
    const deliveryQueue = {
      accept: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ApplicationPublishedArtifactRelayService({
      bindingReader: bindingStore as any,
      artifactDeliverySink: deliveryQueue as any,
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
      expect(deliveryQueue.accept).toHaveBeenCalledWith({
        runId: "run-1",
        applicationId: "app-1",
        bindingId: "binding-1",
        revisionId: "revision-1",
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
            agentRunId: "run-1",
            displayName: "Writer",
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
        launchRequestId: "intent-1",
        status: "ATTACHED",
        executionResourceRef: {
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: "brief-studio-team",
        },
        runtime: {
          subject: "TEAM_RUN",
          teamRunId: "team-run-1",
          definitionId: "team-def-1",
          members: [
            {
              memberAddress: "/researcher",
              displayName: "Researcher",
              agentRunId: "researcher_member_run",
            },
          ],
        },
        createdAt: "2026-04-22T08:00:00.000Z",
        updatedAt: "2026-04-22T08:00:00.000Z",
        terminatedAt: null,
        lastErrorMessage: null,
      }),
    };
    const deliveryQueue = {
      accept: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ApplicationPublishedArtifactRelayService({
      bindingReader: bindingStore as any,
      artifactDeliverySink: deliveryQueue as any,
    });

    await service.relayArtifactForExecutionContext({
      runId: "researcher_member_run",
      applicationExecutionContext: {
        applicationId: "app-1",
        bindingId: "binding-1",
        producer: {
          agentRunId: "researcher_member_run",
          displayName: "Researcher",
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

    expect(deliveryQueue.accept).toHaveBeenCalledWith({
      runId: "researcher_member_run",
      applicationId: "app-1",
      bindingId: "binding-1",
      revisionId: "revision-1",
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
          agentRunId: "researcher_member_run",
          displayName: "Researcher",
        },
      },
    });
  });
});
