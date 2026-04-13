import type {
  ApplicationDeliveryStateProjection,
  ApplicationMemberArtifactProjection,
  ApplicationMemberProgressProjection,
  ApplicationMemberProjection,
  ApplicationProducerProvenance,
  ApplicationSessionSnapshot,
  PublishApplicationEventInputV1,
} from "../domain/models.js";

const sortMembers = (members: ApplicationMemberProjection[]): ApplicationMemberProjection[] =>
  [...members].sort(
    (left, right) =>
      left.teamPath.join("/").localeCompare(right.teamPath.join("/")) ||
      left.displayName.localeCompare(right.displayName) ||
      left.memberRouteKey.localeCompare(right.memberRouteKey),
  );

const resolvePrimaryArtifactKey = (
  artifactsByKey: Record<string, ApplicationMemberArtifactProjection>,
): string | null => {
  const retained = Object.values(artifactsByKey)
    .filter((artifact) => artifact.state !== "superseded")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return retained[0]?.publicationKey ?? null;
};

const resolvePrimaryProgressKey = (
  progressByKey: Record<string, ApplicationMemberProgressProjection>,
): string | null =>
  Object.values(progressByKey)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]?.publicationKey ?? null;

const updateMemberProjection = (
  member: ApplicationMemberProjection,
  publication: PublishApplicationEventInputV1,
  producer: ApplicationProducerProvenance,
  publishedAt: string,
): ApplicationMemberProjection => {
  if (publication.publicationFamily === "MEMBER_ARTIFACT") {
    const artifactsByKey = {
      ...member.artifactsByKey,
      [publication.publicationKey]: {
        publicationKey: publication.publicationKey,
        artifactType: publication.artifactType,
        state: publication.state,
        title: publication.title,
        summary: publication.summary?.trim() || null,
        artifactRef: publication.artifactRef,
        isFinal: Boolean(publication.isFinal),
        updatedAt: publishedAt,
        producer,
      },
    };
    return {
      ...member,
      artifactsByKey,
      primaryArtifactKey: resolvePrimaryArtifactKey(artifactsByKey),
    };
  }

  if (publication.publicationFamily === "PROGRESS") {
    const progressByKey = {
      ...member.progressByKey,
      [publication.publicationKey]: {
        publicationKey: publication.publicationKey,
        phaseLabel: publication.phaseLabel,
        state: publication.state,
        percent: typeof publication.percent === "number" ? publication.percent : null,
        detailText: publication.detailText?.trim() || null,
        updatedAt: publishedAt,
        producer,
      },
    };
    return {
      ...member,
      progressByKey,
      primaryProgressKey: resolvePrimaryProgressKey(progressByKey),
    };
  }

  return member;
};

export class ApplicationPublicationProjector {
  project(
    snapshot: ApplicationSessionSnapshot,
    publication: PublishApplicationEventInputV1,
    producer: ApplicationProducerProvenance,
    publishedAt: string,
  ): ApplicationSessionSnapshot {
    if (publication.publicationFamily === "DELIVERY_STATE") {
      const nextDelivery: ApplicationDeliveryStateProjection = {
        publicationKey: publication.publicationKey,
        deliveryState: publication.deliveryState,
        title: publication.title?.trim() || null,
        summary: publication.summary?.trim() || null,
        artifactType: publication.artifactType?.trim() || null,
        artifactRef: publication.artifactRef ?? null,
        updatedAt: publishedAt,
        producer,
      };

      return {
        ...snapshot,
        view: {
          ...snapshot.view,
          delivery: {
            current: nextDelivery,
          },
        },
      };
    }

    return {
      ...snapshot,
      view: {
        ...snapshot.view,
        members: sortMembers(
          snapshot.view.members.map((member) =>
            member.memberRouteKey === producer.memberRouteKey
              ? updateMemberProjection(member, publication, producer, publishedAt)
              : member,
          ),
        ),
      },
    };
  }
}
