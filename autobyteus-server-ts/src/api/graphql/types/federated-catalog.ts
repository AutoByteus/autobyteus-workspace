import { Arg, Field, InputType, Int, ObjectType, Query, Resolver } from "type-graphql";
import {
  FederatedCatalogService,
} from "../../../federation/catalog/federated-catalog-service.js";

@ObjectType()
class FederatedAgentRef {
  @Field(() => String)
  homeNodeId!: string;

  @Field(() => String)
  definitionId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field(() => [String])
  toolNames!: string[];

  @Field(() => [String])
  skillNames!: string[];
}

@ObjectType()
class FederatedTeamRef {
  @Field(() => String)
  homeNodeId!: string;

  @Field(() => String)
  definitionId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  role!: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field(() => String)
  coordinatorMemberName!: string;

  @Field(() => Int)
  memberCount!: number;

  @Field(() => Int)
  nestedTeamCount!: number;
}

@ObjectType()
export class FederatedNodeCatalog {
  @Field(() => String)
  nodeId!: string;

  @Field(() => String)
  nodeName!: string;

  @Field(() => String)
  baseUrl!: string;

  @Field(() => String)
  status!: "ready" | "degraded" | "unreachable";

  @Field(() => String, { nullable: true })
  errorMessage!: string | null;

  @Field(() => [FederatedAgentRef])
  agents!: FederatedAgentRef[];

  @Field(() => [FederatedTeamRef])
  teams!: FederatedTeamRef[];
}

@InputType()
export class FederatedCatalogNodeInput {
  @Field(() => String)
  nodeId!: string;

  @Field(() => String)
  nodeName!: string;

  @Field(() => String)
  baseUrl!: string;

  @Field(() => String, { nullable: true })
  nodeType?: string | null;
}

@InputType()
export class FederatedNodeCatalogQueryInput {
  @Field(() => [FederatedCatalogNodeInput])
  nodes!: FederatedCatalogNodeInput[];
}

@Resolver()
export class FederatedCatalogResolver {
  private readonly federatedCatalogService: FederatedCatalogService;

  constructor() {
    this.federatedCatalogService = new FederatedCatalogService();
  }

  @Query(() => [FederatedNodeCatalog])
  async federatedNodeCatalog(
    @Arg("input", () => FederatedNodeCatalogQueryInput) input: FederatedNodeCatalogQueryInput,
  ): Promise<FederatedNodeCatalog[]> {
    return this.federatedCatalogService.listCatalogByNodes({
      nodes: input.nodes,
    });
  }
}
