import { describe, expect, it } from "vitest";
import { ApplicationPublicationProjector } from "../../../src/application-sessions/services/application-publication-projector.js";
import type {
  ApplicationProducerProvenance,
  ApplicationSessionSnapshot,
} from "../../../src/application-sessions/domain/models.js";

const producer: ApplicationProducerProvenance = {
  memberRouteKey: "requirements_writer",
  displayName: "Requirements Writer",
  teamPath: [],
  runId: "member-run-1",
  runtimeKind: "AGENT_TEAM_MEMBER",
};

const buildSnapshot = (): ApplicationSessionSnapshot => ({
  applicationSessionId: "app-session-1",
  application: {
    applicationId: "bundle-app__pkg__requirements-app",
    localApplicationId: "requirements-app",
    packageId: "pkg",
    name: "Requirements App",
    description: null,
    iconAssetPath: null,
    entryHtmlAssetPath: "application-bundles/requirements-app/assets/ui/index.html",
    writable: true,
  },
  runtime: {
    kind: "AGENT_TEAM",
    runId: "team-run-1",
    definitionId: "bundle-team__pkg__requirements-app__requirements-team",
  },
  view: {
    delivery: { current: null },
    members: [
      {
        memberRouteKey: "requirements_writer",
        displayName: "Requirements Writer",
        teamPath: [],
        runtimeTarget: {
          runId: "member-run-1",
          runtimeKind: "AGENT_TEAM_MEMBER",
        },
        artifactsByKey: {},
        primaryArtifactKey: null,
        progressByKey: {},
        primaryProgressKey: null,
      },
    ],
  },
  createdAt: "2026-04-13T10:00:00.000Z",
  terminatedAt: null,
});

describe("ApplicationPublicationProjector", () => {
  it("retains progress and artifact families independently while delivery stays separate", () => {
    const projector = new ApplicationPublicationProjector();
    const initial = buildSnapshot();

    const withProgress = projector.project(
      initial,
      {
        contractVersion: "1",
        publicationFamily: "PROGRESS",
        publicationKey: "drafting",
        phaseLabel: "Drafting requirements",
        state: "working",
        percent: 40,
        detailText: "Synthesizing findings",
      },
      producer,
      "2026-04-13T10:05:00.000Z",
    );

    const withArtifact = projector.project(
      withProgress,
      {
        contractVersion: "1",
        publicationFamily: "MEMBER_ARTIFACT",
        publicationKey: "requirements_artifact",
        artifactType: "markdown_document",
        state: "ready",
        title: "Requirements Draft",
        summary: "First complete draft",
        artifactRef: {
          kind: "WORKSPACE_FILE",
          workspaceId: "workspace-1",
          path: "/workspace/requirements.md",
        },
        isFinal: true,
      },
      producer,
      "2026-04-13T10:10:00.000Z",
    );

    const withDelivery = projector.project(
      withArtifact,
      {
        contractVersion: "1",
        publicationFamily: "DELIVERY_STATE",
        publicationKey: "final_delivery",
        deliveryState: "ready",
        title: "Delivery ready",
        summary: "Ready for review",
        artifactType: "markdown_document",
        artifactRef: {
          kind: "WORKSPACE_FILE",
          workspaceId: "workspace-1",
          path: "/workspace/requirements.md",
        },
      },
      producer,
      "2026-04-13T10:15:00.000Z",
    );

    const member = withDelivery.view.members[0];
    expect(member?.progressByKey.drafting).toMatchObject({
      phaseLabel: "Drafting requirements",
      state: "working",
      percent: 40,
    });
    expect(member?.primaryProgressKey).toBe("drafting");

    expect(member?.artifactsByKey.requirements_artifact).toMatchObject({
      artifactType: "markdown_document",
      state: "ready",
      title: "Requirements Draft",
      isFinal: true,
    });
    expect(member?.primaryArtifactKey).toBe("requirements_artifact");

    expect(withDelivery.view.delivery.current).toMatchObject({
      publicationKey: "final_delivery",
      deliveryState: "ready",
      title: "Delivery ready",
    });
    expect(member?.progressByKey.drafting).toBeDefined();
    expect(member?.artifactsByKey.requirements_artifact).toBeDefined();
  });
});
