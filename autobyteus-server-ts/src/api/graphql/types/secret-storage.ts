import { Field, ObjectType, Query, Resolver } from 'type-graphql';
import { getSecretVaultRuntime } from '../../../secret-management/secret-vault-runtime.js';

@ObjectType()
class SecretVaultStatus {
  @Field(() => String)
  health!: string;

  @Field(() => String, { nullable: true })
  instructionCode!: string | null;

  @Field(() => String)
  assurance!: 'LOCAL_HARDENED';
}

@Resolver()
export class SecretStorageResolver {
  @Query(() => SecretVaultStatus)
  async getSecretVaultStatus(): Promise<SecretVaultStatus> {
    const health = await getSecretVaultRuntime().getHealth();
    return {
      health: health.state,
      instructionCode: 'instructionCode' in health ? health.instructionCode : null,
      assurance: 'LOCAL_HARDENED',
    };
  }
}
