import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { WorkspaceConfig } from "autobyteus-ts";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { WorkspaceConverter } from "../converters/workspace-converter.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const ensureJsonString = (payload: string | object | null): string | null => {
  if (payload === null) {
    return null;
  }
  if (typeof payload === "string") {
    return payload;
  }
  return JSON.stringify(payload);
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
      const workspaceConfig = new WorkspaceConfig({ rootPath: input.rootPath });
      const workspace = await this.workspaceManager.createWorkspace(workspaceConfig);

      const fileExplorer = await workspace.getFileExplorer();
      const fileExplorerJson = await fileExplorer.toJson();

      return {
        workspaceId: workspace.workspaceId,
        name: workspace.getName(),
        config: workspace.config.toDict(),
        fileExplorer: ensureJsonString(fileExplorerJson),
        absolutePath: workspace.getBasePath(),
        isTemp: false,
      };
    } catch (error) {
      logger.error(`Unexpected error creating workspace: ${String(error)}`);
      throw new Error(String(error));
    }
  }
}
