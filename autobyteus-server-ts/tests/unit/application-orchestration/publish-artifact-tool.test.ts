import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationRunBindingSummary } from "@autobyteus/application-sdk-contracts";
import { ApplicationExecutionEventIngressService } from "../../../src/application-orchestration/services/application-execution-event-ingress-service.js";
import { ApplicationOrchestrationStartupGate } from "../../../src/application-orchestration/services/application-orchestration-startup-gate.js";
import { publishArtifact } from "../../../src/application-orchestration/tools/publish-artifact-tool.js";

const buildBinding = (): ApplicationRunBindingSummary => ({
  bindingId: "binding-1",
  applicationId: "bundle-app__pkg__brief-studio",
  bindingIntentId: "binding-intent-1",
  status: "ATTACHED",
  resourceRef: {
    owner: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    runId: "team-run-1",
    definitionId: "bundle-team__pkg__brief-studio__brief-studio-team",
    members: [
      {
        memberName: "writer",
        memberRouteKey: "writer",
        displayName: "Writer",
        teamPath: [],
        runId: "team-run-1::writer",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: "2026-04-19T10:00:00.000Z",
  updatedAt: "2026-04-19T10:00:00.000Z",
  terminatedAt: null,
  lastErrorMessage: null,
});

describe("publishArtifact", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ApplicationOrchestrationStartupGate.resetInstance();
  });

  it("waits for startup recovery before forwarding live artifact ingress", async () => {
    const gate = ApplicationOrchestrationStartupGate.getInstance();
    const binding = buildBinding();
    const appendSpy = vi
      .spyOn(ApplicationExecutionEventIngressService.prototype, "appendRuntimeArtifactEvent")
      .mockResolvedValue(binding);

    let releaseStartup!: () => void;
    const startupBlocked = new Promise<void>((resolve) => {
      releaseStartup = resolve;
    });

    const startupPromise = gate.runStartupRecovery(async () => {
      await startupBlocked;
    });

    const publishPromise = publishArtifact(
      {
        agentId: binding.runtime.members[0]!.runId,
        customData: {
          application_execution_context: {
            applicationId: binding.applicationId,
            bindingId: binding.bindingId,
            producer: {
              memberRouteKey: "writer",
              memberName: "writer",
              displayName: "Writer",
              teamPath: [],
              runtimeKind: "AGENT_TEAM_MEMBER",
            },
          },
        },
      },
      "1",
      "artifact-1",
      "final_brief",
      "Market Entry Brief",
      "Draft ready for review.",
      {
        kind: "INLINE_JSON",
        mimeType: "application/json",
        value: { title: "Market Entry Brief" },
      },
      { revision: 2 },
      true,
    );

    await Promise.resolve();
    expect(appendSpy).not.toHaveBeenCalled();

    releaseStartup();
    await startupPromise;

    await expect(publishPromise).resolves.toBe(JSON.stringify({
      success: true,
      bindingId: binding.bindingId,
      bindingIntentId: binding.bindingIntentId,
      artifactKey: "artifact-1",
    }));

    expect(appendSpy).toHaveBeenCalledWith({
      runId: binding.runtime.members[0]!.runId,
      customData: {
        application_execution_context: {
          applicationId: binding.applicationId,
          bindingId: binding.bindingId,
          producer: {
            memberRouteKey: "writer",
            memberName: "writer",
            displayName: "Writer",
            teamPath: [],
            runtimeKind: "AGENT_TEAM_MEMBER",
          },
        },
      },
      publication: {
        contractVersion: "1",
        artifactKey: "artifact-1",
        artifactType: "final_brief",
        title: "Market Entry Brief",
        summary: "Draft ready for review.",
        artifactRef: {
          kind: "INLINE_JSON",
          mimeType: "application/json",
          value: { title: "Market Entry Brief" },
        },
        metadata: { revision: 2 },
        isFinal: true,
      },
    });
  });

  it.each([
    {
      name: "normalizes INLINE_JSON type/data shorthand from live model tool calls",
      artifactRef: {
        type: "INLINE_JSON",
        data: {
          body: "Draft body from a provider-backed tool call.",
        },
      },
      expectedArtifactRef: {
        kind: "INLINE_JSON",
        mimeType: "application/json",
        value: {
          body: "Draft body from a provider-backed tool call.",
        },
      },
    },
    {
      name: "wraps a kindless object artifactRef as canonical INLINE_JSON",
      artifactRef: {
        briefTitle: "Live Browser Control Brief",
        outline: ["Scope", "Risks", "Next steps"],
      },
      expectedArtifactRef: {
        kind: "INLINE_JSON",
        mimeType: "application/json",
        value: {
          briefTitle: "Live Browser Control Brief",
          outline: ["Scope", "Risks", "Next steps"],
        },
      },
    },
  ])("$name", async ({ artifactRef, expectedArtifactRef }) => {
    const binding = buildBinding();
    const appendSpy = vi
      .spyOn(ApplicationExecutionEventIngressService.prototype, "appendRuntimeArtifactEvent")
      .mockResolvedValue(binding);

    await expect(
      publishArtifact(
        {
          agentId: binding.runtime.members[0]!.runId,
          customData: {
            application_execution_context: {
              applicationId: binding.applicationId,
              bindingId: binding.bindingId,
              producer: {
                memberRouteKey: "writer",
                memberName: "writer",
                displayName: "Writer",
                teamPath: [],
                runtimeKind: "AGENT_TEAM_MEMBER",
              },
            },
          },
        },
        "1",
        "artifact-2",
        "brief_draft",
        "Draft title",
        "Draft summary",
        artifactRef,
        null,
        false,
      ),
    ).resolves.toBe(JSON.stringify({
      success: true,
      bindingId: binding.bindingId,
      bindingIntentId: binding.bindingIntentId,
      artifactKey: "artifact-2",
    }));

    expect(appendSpy).toHaveBeenCalledWith(expect.objectContaining({
      publication: expect.objectContaining({
        artifactRef: expectedArtifactRef,
      }),
    }));
  });
});
