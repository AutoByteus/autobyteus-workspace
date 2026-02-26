import { Field, InputType, ObjectType } from "type-graphql";

@ObjectType()
export class ExternalChannelCapabilities {
  @Field(() => Boolean)
  bindingCrudEnabled!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => [String])
  acceptedProviderTransportPairs!: string[];
}

@ObjectType()
export class ExternalChannelBindingGql {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  provider!: string;

  @Field(() => String)
  transport!: string;

  @Field(() => String)
  accountId!: string;

  @Field(() => String)
  peerId!: string;

  @Field(() => String, { nullable: true })
  threadId?: string | null;

  @Field(() => String)
  targetType!: string;

  @Field(() => String)
  targetId!: string;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class ExternalChannelBindingTargetOptionGql {
  @Field(() => String)
  targetType!: string;

  @Field(() => String)
  targetId!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  status!: string;
}

@InputType()
export class UpsertExternalChannelBindingInput {
  @Field(() => String)
  provider!: string;

  @Field(() => String)
  transport!: string;

  @Field(() => String)
  accountId!: string;

  @Field(() => String)
  peerId!: string;

  @Field(() => String, { nullable: true })
  threadId?: string | null;

  @Field(() => String)
  targetType!: string;

  @Field(() => String)
  targetId!: string;
}
