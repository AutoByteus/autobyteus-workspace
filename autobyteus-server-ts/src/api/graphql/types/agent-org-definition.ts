import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import { GraphQLError } from "graphql";
import { getStudioAgentOrgDefinitionService, getStudioDefinitionAdmissionService } from "../studio-application-api-services.js";
import { AgentOrgDefinition as DomainOrg, AgentOrgDefinitionUpdate, AgentOrgMember as DomainMember } from "../../../agent-org-definition/domain/agent-org-definition.js";
import { GraphqlDefaultLaunchConfig, GraphqlDefaultLaunchConfigInput, toDomainDefaultLaunchConfig, toGraphqlDefaultLaunchConfig } from "./default-launch-config.js";

export enum AgentOrgMemberType { AGENT = "AGENT", AGENT_TEAM = "AGENT_TEAM" }
export enum AgentOrgMemberScope { SHARED = "SHARED", AGENT_ORG_OWNED = "AGENT_ORG_OWNED", APPLICATION_OWNED = "APPLICATION_OWNED" }
registerEnumType(AgentOrgMemberType, { name: "AgentOrgMemberType" });
registerEnumType(AgentOrgMemberScope, { name: "AgentOrgMemberScope" });

@ObjectType() class AgentOrgMember {
  @Field(() => String) memberName!: string;
  @Field(() => String) ref!: string;
  @Field(() => AgentOrgMemberType) refType!: AgentOrgMemberType;
  @Field(() => AgentOrgMemberScope) refScope!: AgentOrgMemberScope;
}
@InputType() class AgentOrgMemberInput {
  @Field(() => String) memberName!: string;
  @Field(() => String) ref!: string;
  @Field(() => AgentOrgMemberType) refType!: AgentOrgMemberType;
  @Field(() => AgentOrgMemberScope) refScope!: AgentOrgMemberScope;
}
@ObjectType() class AgentOrgHandoff { @Field(() => String) from!: string; @Field(() => String) to!: string; @Field(() => [String]) rules!: string[]; }
@InputType() class AgentOrgHandoffInput { @Field(() => String) from!: string; @Field(() => String) to!: string; @Field(() => [String]) rules!: string[]; }
@ObjectType() export class AgentOrgDefinition {
  @Field(() => String) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  @Field(() => String) instructions!: string;
  @Field(() => String, { nullable: true }) category!: string | null;
  @Field(() => [AgentOrgMember]) members!: AgentOrgMember[];
  @Field(() => [AgentOrgHandoff]) handoffs!: AgentOrgHandoff[];
  @Field(() => String, { nullable: true }) avatarUrl!: string | null;
  @Field(() => GraphqlDefaultLaunchConfig, { nullable: true }) defaultLaunchConfig!: GraphqlDefaultLaunchConfig | null;
  @Field(() => String, { nullable: true }) revision!: string | null;
}
@InputType() class CreateAgentOrgDefinitionInput {
  @Field(() => String) name!: string;
  @Field(() => String) description!: string;
  @Field(() => String) instructions!: string;
  @Field(() => String, { nullable: true }) category?: string | null;
  @Field(() => [AgentOrgMemberInput]) members!: AgentOrgMemberInput[];
  @Field(() => [AgentOrgHandoffInput], { nullable: true }) handoffs?: AgentOrgHandoffInput[];
  @Field(() => String, { nullable: true }) avatarUrl?: string | null;
  @Field(() => GraphqlDefaultLaunchConfigInput, { nullable: true }) defaultLaunchConfig?: GraphqlDefaultLaunchConfigInput | null;
}
@InputType() class UpdateAgentOrgDefinitionInput {
  @Field(() => String) id!: string;
  @Field(() => String) expectedRevision!: string;
  @Field(() => String, { nullable: true }) name?: string;
  @Field(() => String, { nullable: true }) description?: string;
  @Field(() => String, { nullable: true }) instructions?: string;
  @Field(() => String, { nullable: true }) category?: string;
  @Field(() => [AgentOrgMemberInput], { nullable: true }) members?: AgentOrgMemberInput[];
  @Field(() => [AgentOrgHandoffInput], { nullable: true }) handoffs?: AgentOrgHandoffInput[];
  @Field(() => String, { nullable: true }) avatarUrl?: string;
  @Field(() => GraphqlDefaultLaunchConfigInput, { nullable: true }) defaultLaunchConfig?: GraphqlDefaultLaunchConfigInput | null;
}
@ObjectType() class DefinitionEndpoint {
  @Field(() => String) kind!: string; @Field(() => String) address!: string; @Field(() => String) memberName!: string; @Field(() => String) definitionId!: string;
  @Field(() => String, { nullable: true }) coordinatorAddress!: string | null;
  @Field(() => String, { nullable: true }) coordinatorMemberName!: string | null;
}
@ObjectType() class DefinitionEndpointCatalog { @Field(() => [DefinitionEndpoint]) from!: DefinitionEndpoint[]; @Field(() => [DefinitionEndpoint]) to!: DefinitionEndpoint[]; }

const toDomainScope = (value: AgentOrgMemberScope): DomainMember["refScope"] => {
  switch (value) {
    case AgentOrgMemberScope.SHARED: return "shared";
    case AgentOrgMemberScope.AGENT_ORG_OWNED: return "org_local";
    case AgentOrgMemberScope.APPLICATION_OWNED: return "application_owned";
    default: throw new Error(`Unsupported AgentOrg member scope '${String(value)}'.`);
  }
};
const toGraphqlScope = (value: DomainMember["refScope"]): AgentOrgMemberScope => {
  switch (value) {
    case "shared": return AgentOrgMemberScope.SHARED;
    case "org_local": return AgentOrgMemberScope.AGENT_ORG_OWNED;
    case "application_owned": return AgentOrgMemberScope.APPLICATION_OWNED;
    default: throw new Error(`Unsupported authored AgentOrg member scope '${String(value)}'.`);
  }
};

const member = (value: AgentOrgMemberInput): DomainMember => new DomainMember({
  memberName: value.memberName, ref: value.ref,
  refType: value.refType === AgentOrgMemberType.AGENT ? "agent" : "agent_team",
  refScope: toDomainScope(value.refScope),
});
const project = (value: DomainOrg): AgentOrgDefinition => ({
  id: value.id ?? "", name: value.name, description: value.description, instructions: value.instructions,
  category: value.category, avatarUrl: value.avatarUrl, revision: value.revision,
  defaultLaunchConfig: toGraphqlDefaultLaunchConfig(value.defaultLaunchConfig),
  handoffs: value.handoffs.map((item) => ({ from: item.from, to: item.to, rules: [...item.rules] })),
  members: value.members.map((item) => ({
    memberName: item.memberName, ref: item.ref,
    refType: item.refType === "agent" ? AgentOrgMemberType.AGENT : AgentOrgMemberType.AGENT_TEAM,
    refScope: toGraphqlScope(item.refScope),
  })),
});
const graphError = (error: unknown): GraphQLError => new GraphQLError(error instanceof Error ? error.message : String(error), {
  extensions: { code: typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "AGENT_ORG_DEFINITION_INVALID" },
});

@Resolver()
export class AgentOrgDefinitionResolver {
  private readonly service = getStudioAgentOrgDefinitionService();
  @Query(() => [AgentOrgDefinition]) async agentOrgDefinitions(): Promise<AgentOrgDefinition[]> {
    return (await getStudioDefinitionAdmissionService().scan())
      .flatMap((result) => result.status === "available" && result.subjectKind === "agent_org" ? [result.definition] : [])
      .filter((definition): definition is DomainOrg => "members" in definition).map(project);
  }
  @Query(() => AgentOrgDefinition, { nullable: true }) async agentOrgDefinition(@Arg("id", () => String) id: string): Promise<AgentOrgDefinition | null> {
    const admitted = await getStudioDefinitionAdmissionService().requireAvailable("agent_org", id).catch(() => null);
    return admitted && "members" in admitted.definition ? project(admitted.definition) : null;
  }
  @Query(() => DefinitionEndpointCatalog) async agentOrgEndpointCatalog(@Arg("id", () => String) id: string): Promise<DefinitionEndpointCatalog> {
    await getStudioDefinitionAdmissionService().requireAvailable("agent_org", id);
    const value = await this.service.getEndpointCatalog(id); return { from: [...value.from], to: [...value.to] };
  }
  @Mutation(() => AgentOrgDefinition) async createAgentOrgDefinition(@Arg("input", () => CreateAgentOrgDefinitionInput) input: CreateAgentOrgDefinitionInput): Promise<AgentOrgDefinition> {
    try { return project(await this.service.createDefinition(new DomainOrg({ ...input, members: input.members.map(member), handoffs: input.handoffs, defaultLaunchConfig: toDomainDefaultLaunchConfig(input.defaultLaunchConfig) }))); }
    catch (error) { throw graphError(error); }
  }
  @Mutation(() => AgentOrgDefinition) async updateAgentOrgDefinition(@Arg("input", () => UpdateAgentOrgDefinitionInput) input: UpdateAgentOrgDefinitionInput): Promise<AgentOrgDefinition> {
    try { return project(await this.service.updateDefinition(input.id, new AgentOrgDefinitionUpdate({ ...input, members: input.members?.map(member), handoffs: input.handoffs, defaultLaunchConfig: toDomainDefaultLaunchConfig(input.defaultLaunchConfig), expectedRevision: input.expectedRevision }))); }
    catch (error) { throw graphError(error); }
  }
  @Mutation(() => Boolean) deleteAgentOrgDefinition(@Arg("id", () => String) id: string): Promise<boolean> { return this.service.deleteDefinition(id); }
}
