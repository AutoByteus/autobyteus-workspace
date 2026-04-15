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
      },
    ],
  },
  createdAt: "2026-04-13T10:00:00.000Z",
  terminatedAt: null,
});

describe("ApplicationPublicationProjector", () => {
  it("retains artifacts by artifactKey and advances the primary artifact to the newest publication", () => {
    const projector = new ApplicationPublicationProjector();
    const initial = buildSnapshot();

    const withDraft = projector.project(
      initial,
      {
        contractVersion: "1",
        artifactKey: "working-draft",
        artifactType: "markdown_document",
        title: "Requirements Draft",
        summary: "First complete draft",
        artifactRef: {
          kind: "WORKSPACE_FILE",
          workspaceId: "workspace-1",
          path: "/workspace/requirements.md",
        },
        metadata: {
          revision: 1,
        },
        isFinal: false,
      },
      producer,
      "2026-04-13T10:10:00.000Z",
    );

    const withFinal = projector.project(
      withDraft,
      {
        contractVersion: "1",
        artifactKey: "review-package",
        artifactType: "markdown_document",
        title: "Requirements Final",
        summary: "Ready for review",
        artifactRef: {
          kind: "WORKSPACE_FILE",
          workspaceId: "workspace-1",
          path: "/workspace/requirements-final.md",
        },
        isFinal: true,
      },
      producer,
      "2026-04-13T10:15:00.000Z",
    );

    const member = withFinal.view.members[0];
    expect(member?.artifactsByKey["working-draft"]).toMatchObject({
      artifactType: "markdown_document",
      title: "Requirements Draft",
      metadata: { revision: 1 },
      isFinal: false,
    });
    expect(member?.artifactsByKey["review-package"]).toMatchObject({
      artifactType: "markdown_document",
      title: "Requirements Final",
      isFinal: true,
    });
    expect(member?.primaryArtifactKey).toBe("review-package");
  });
});
