import type {
  ApplicationEventDispatchEnvelope,
  NormalizedPublicationEvent,
  NormalizedPublicationEventFamily,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationCatalogEntry } from "../../application-bundles/domain/models.js";
import type { ApplicationRuntimeTargetKind } from "@autobyteus/application-sdk-contracts";

export type ApplicationSessionApplication = Pick<
  ApplicationCatalogEntry,
  | "id"
  | "localApplicationId"
  | "packageId"
  | "name"
  | "description"
  | "iconAssetPath"
  | "entryHtmlAssetPath"
  | "writable"
>;

export type ApplicationSessionRuntime = {
  kind: ApplicationRuntimeTargetKind;
  runId: string;
  definitionId: string;
};

export type ApplicationArtifactRef =
  | { kind: "WORKSPACE_FILE"; workspaceId?: string | null; path: string }
  | { kind: "URL"; url: string }
  | { kind: "BUNDLE_ASSET"; assetPath: string }
  | { kind: "INLINE_JSON"; mimeType: string; value: unknown };

export type ApplicationProducerRuntimeKind = "AGENT" | "AGENT_TEAM_MEMBER";

export type ApplicationProducerProvenance = {
  memberRouteKey: string;
  displayName: string;
  teamPath: string[];
  runId: string;
  runtimeKind: ApplicationProducerRuntimeKind;
};

export type ApplicationArtifactProjection = {
  artifactKey: string;
  artifactType: string;
  title: string | null;
  summary: string | null;
  artifactRef: ApplicationArtifactRef;
  metadata: Record<string, unknown> | null;
  isFinal: boolean;
  updatedAt: string;
  producer: ApplicationProducerProvenance;
};

export type ApplicationMemberProjection = {
  memberRouteKey: string;
  displayName: string;
  teamPath: string[];
  runtimeTarget: {
    runId: string;
    runtimeKind: ApplicationProducerRuntimeKind;
  } | null;
  artifactsByKey: Record<string, ApplicationArtifactProjection>;
  primaryArtifactKey: string | null;
};

export type ApplicationSessionView = {
  members: ApplicationMemberProjection[];
};

export type ApplicationSessionSnapshot = {
  applicationSessionId: string;
  application: {
    applicationId: string;
    localApplicationId: string;
    packageId: string;
    name: string;
    description: string | null;
    iconAssetPath: string | null;
    entryHtmlAssetPath: string;
    writable: boolean;
  };
  runtime: ApplicationSessionRuntime;
  view: ApplicationSessionView;
  createdAt: string;
  terminatedAt: string | null;
};

export type ApplicationSessionBindingResolution = "requested_live" | "application_active" | "none";

export type ApplicationSessionBinding = {
  applicationId: string;
  requestedSessionId: string | null;
  resolvedSessionId: string | null;
  resolution: ApplicationSessionBindingResolution;
  session: ApplicationSessionSnapshot | null;
};

export type PublishArtifactInputV1 = {
  contractVersion: "1";
  artifactKey: string;
  artifactType: string;
  title?: string | null;
  summary?: string | null;
  artifactRef: ApplicationArtifactRef;
  metadata?: Record<string, unknown> | null;
  isFinal?: boolean | null;
};

export type ApplicationSessionLaunchMemberContext = {
  memberRouteKey: string;
  displayName: string;
  teamPath: string[];
  runtimeKind: ApplicationProducerRuntimeKind;
};

export type ApplicationSessionLaunchContext = {
  applicationSessionId: string;
  applicationId: string;
  member: ApplicationSessionLaunchMemberContext;
};

export type ApplicationNormalizedPublicationPayload =
  | PublishArtifactInputV1
  | {
      session: {
        createdAt: string;
        runtime: ApplicationSessionRuntime;
      };
    }
  | {
      session: {
        terminatedAt: string;
        runtime: ApplicationSessionRuntime;
      };
    };

export type ApplicationPublicationJournalEvent = NormalizedPublicationEvent<ApplicationNormalizedPublicationPayload>;

export type ApplicationPublicationJournalRecord = {
  event: ApplicationPublicationJournalEvent;
  ackedAt: string | null;
  lastDispatchAttemptNumber: number;
  lastDispatchedAt: string | null;
  lastErrorKind: string | null;
  lastErrorMessage: string | null;
  nextAttemptAfter: string | null;
};

export type ApplicationPublicationDispatchEnvelope = ApplicationEventDispatchEnvelope<ApplicationNormalizedPublicationPayload>;

export type ApplicationPublicationDispatchResult = {
  status: "acknowledged" | "missing_handler";
};

export type ApplicationPublicationEventFamily = NormalizedPublicationEventFamily;
