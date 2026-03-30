import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { WorkspaceConverter } from "../converters/workspace-converter.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

@ObjectType()
export class WorkspaceInfo {
  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => GraphQLJSON)
  config!: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  fileExplorer?: string | null;

  @Field(() => String, { nullable: true })
  absolutePath?: string | null;

  @Field(() => Boolean)
  isTemp!: boolean;
}

@InputType()
export class CreateWorkspaceInput {
  @Field(() => String)
  rootPath!: string;
}

@Resolver()
export class WorkspaceResolver {
  private get workspaceManager() {
    return getWorkspaceManager();
  }

  @Query(() => [WorkspaceInfo])
  async workspaces(): Promise<WorkspaceInfo[]> {
    try {
      const domainWorkspaces = this.workspaceManager.getAllWorkspaces();
      const graphqlWorkspaces: WorkspaceInfo[] = [];
      for (const workspace of domainWorkspaces) {
        const graphqlWorkspace = await WorkspaceConverter.toGraphql(workspace);
        graphqlWorkspaces.push(graphqlWorkspace);
      }
      return graphqlWorkspaces;
    } catch (error) {
      logger.error(`Failed to fetch all workspaces: ${String(error)}`);
      throw new Error("Unable to fetch workspaces at this time.");
    }
  }

  @Mutation(() => WorkspaceInfo)
  async createWorkspace(
    @Arg("input", () => CreateWorkspaceInput) input: CreateWorkspaceInput,
  ): Promise<WorkspaceInfo> {
    logger.info("GraphQL mutation to create workspace");
    try {
      const workspace = await this.workspaceManager.createWorkspace({ rootPath: input.rootPath });
      return WorkspaceConverter.toGraphql(workspace);
    } catch (error) {
      logger.error(`Unexpected error creating workspace: ${String(error)}`);
      throw new Error(String(error));
    }
  }
}
