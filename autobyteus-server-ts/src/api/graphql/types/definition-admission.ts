import { Field, ObjectType, Query, Resolver } from "type-graphql";
import { getStudioDefinitionAdmissionService } from "../studio-application-api-services.js";

@ObjectType()
export class DefinitionAdmissionDiagnostic {
  @Field(() => String) subjectKind!: string;
  @Field(() => String) sourceClass!: string;
  @Field(() => String) packageRoot!: string;
  @Field(() => String) definitionPath!: string;
  @Field(() => String, { nullable: true }) definitionId?: string;
  @Field(() => String) expectedFamily!: string;
  @Field(() => String) code!: string;
  @Field(() => String) reason!: string;
  @Field(() => [String]) dependencyChain!: string[];
  @Field(() => String) ownerAction!: string;
}

@Resolver()
export class DefinitionAdmissionResolver {
  private readonly admission = getStudioDefinitionAdmissionService();

  @Query(() => [DefinitionAdmissionDiagnostic])
  async definitionAdmissionDiagnostics(): Promise<DefinitionAdmissionDiagnostic[]> {
    return (await this.admission.scan())
      .filter((result) => result.status === "unavailable")
      .map((result) => ({ ...result, dependencyChain: [...result.dependencyChain] }));
  }
}
