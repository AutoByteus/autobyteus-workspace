import { Field, ObjectType, Query, Resolver } from 'type-graphql';
import { getSecretStorageConfigurationService } from '../../../secret-management/configuration/secret-storage-configuration-service.js';

@ObjectType()
class SecretStorageStatus {
  @Field(() => String)
  selectedKind!: string;

  @Field(() => String)
  health!: string;

  @Field(() => String, { nullable: true })
  instructionCode!: string | null;

  @Field(() => String, { nullable: true })
  lifecycle!: string | null;

  @Field(() => String)
  assurance!: string;

  @Field(() => Boolean)
  restartRequired!: boolean;
}

@Resolver()
export class SecretStorageResolver {
  @Query(() => SecretStorageStatus)
  async getSecretStorageStatus(): Promise<SecretStorageStatus> {
    const snapshot = await getSecretStorageConfigurationService().snapshot();
    return {
      selectedKind: snapshot.selectedKind,
      health: snapshot.health.state,
      instructionCode: 'instructionCode' in snapshot.health
        ? snapshot.health.instructionCode
        : null,
      lifecycle: snapshot.lifecycle?.kind ?? null,
      assurance: snapshot.assurance,
      restartRequired: snapshot.restartRequired,
    };
  }
}
