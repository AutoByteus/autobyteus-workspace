import type { ApplicationCatalogEntry, ApplicationRuntimeTargetKind } from "../../application-bundles/domain/models.js";

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

export type ApplicationDeliveryState = "waiting" | "in_progress" | "ready" | "blocked";
export type ApplicationMemberArtifactState = "draft" | "ready" | "blocked" | "superseded";
export type ApplicationMemberProgressState = "queued" | "working" | "ready" | "blocked";

export type ApplicationDeliveryStateProjection = {
  publicationKey: string;
  deliveryState: ApplicationDeliveryState;
  title: string | null;
  summary: string | null;
  artifactType: string | null;
  artifactRef: ApplicationArtifactRef | null;
  updatedAt: string;
  producer: ApplicationProducerProvenance;
};

export type ApplicationDeliveryProjection = {
  current: ApplicationDeliveryStateProjection | null;
};

export type ApplicationMemberArtifactProjection = {
  publicationKey: string;
  artifactType: string;
  state: ApplicationMemberArtifactState;
  title: string;
  summary: string | null;
  artifactRef: ApplicationArtifactRef;
  isFinal: boolean;
  updatedAt: string;
  producer: ApplicationProducerProvenance;
};

export type ApplicationMemberProgressProjection = {
  publicationKey: string;
  phaseLabel: string;
  state: ApplicationMemberProgressState;
  percent: number | null;
  detailText: string | null;
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
  artifactsByKey: Record<string, ApplicationMemberArtifactProjection>;
  primaryArtifactKey: string | null;
  progressByKey: Record<string, ApplicationMemberProgressProjection>;
  primaryProgressKey: string | null;
};

export type ApplicationSessionView = {
  delivery: ApplicationDeliveryProjection;
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

export type PublishMemberArtifactEventInputV1 = {
  contractVersion: "1";
  publicationFamily: "MEMBER_ARTIFACT";
  publicationKey: string;
  artifactType: string;
  state: ApplicationMemberArtifactState;
  title: string;
  summary?: string;
  artifactRef: ApplicationArtifactRef;
  isFinal?: boolean;
};

export type PublishDeliveryStateEventInputV1 = {
  contractVersion: "1";
  publicationFamily: "DELIVERY_STATE";
  publicationKey: string;
  deliveryState: ApplicationDeliveryState;
  title?: string;
  summary?: string;
  artifactType?: string;
  artifactRef?: ApplicationArtifactRef;
};

export type PublishProgressEventInputV1 = {
  contractVersion: "1";
  publicationFamily: "PROGRESS";
  publicationKey: string;
  phaseLabel: string;
  state: ApplicationMemberProgressState;
  percent?: number;
  detailText?: string;
};

export type PublishApplicationEventInputV1 =
  | PublishMemberArtifactEventInputV1
  | PublishDeliveryStateEventInputV1
  | PublishProgressEventInputV1;

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
