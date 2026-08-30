import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class RunModelConfigEditabilityObject {
  @Field(() => Boolean)
  editable!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string | null;

}

@ObjectType()
export class RunModelConfigFieldErrorObject {
  @Field(() => String)
  path!: string;

  @Field(() => String)
  message!: string;
}
