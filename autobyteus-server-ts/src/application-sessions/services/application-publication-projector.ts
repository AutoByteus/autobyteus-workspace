import type {
  ApplicationArtifactProjection,
  ApplicationMemberProjection,
  ApplicationProducerProvenance,
  ApplicationSessionSnapshot,
  PublishArtifactInputV1,
} from "../domain/models.js";

const sortMembers = (members: ApplicationMemberProjection[]): ApplicationMemberProjection[] =>
  [...members].sort(
    (left, right) =>
      left.teamPath.join("/").localeCompare(right.teamPath.join("/")) ||
      left.displayName.localeCompare(right.displayName) ||
      left.memberRouteKey.localeCompare(right.memberRouteKey),
  );

const resolvePrimaryArtifactKey = (
  artifactsByKey: Record<string, ApplicationArtifactProjection>,
): string | null =>
  Object.values(artifactsByKey)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]?.artifactKey ?? null;

const updateMemberProjection = (
  member: ApplicationMemberProjection,
  publication: PublishArtifactInputV1,
  producer: ApplicationProducerProvenance,
  publishedAt: string,
): ApplicationMemberProjection => {
  const artifactsByKey = {
    ...member.artifactsByKey,
    [publication.artifactKey]: {
      artifactKey: publication.artifactKey,
      artifactType: publication.artifactType,
      title: publication.title?.trim() || null,
      summary: publication.summary?.trim() || null,
      artifactRef: structuredClone(publication.artifactRef),
      metadata: publication.metadata ? structuredClone(publication.metadata) : null,
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
};

export class ApplicationPublicationProjector {
  project(
    snapshot: ApplicationSessionSnapshot,
    publication: PublishArtifactInputV1,
    producer: ApplicationProducerProvenance,
    publishedAt: string,
  ): ApplicationSessionSnapshot {
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
