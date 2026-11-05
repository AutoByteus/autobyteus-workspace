import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { getWorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { WorkspaceConverter } from "../converters/workspace-converter.js";
import { buildFilesystemWorkspaceId } from "../../../workspaces/workspace-registry-store.js";
import {
  canonicalizeWorkspaceRootPath,
  workspaceDisplayNameFromRootPath,
} from "../../../workspaces/workspace-path-utils.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

@ObjectType("WorkspaceMetadata")
export class WorkspaceMetadataInfo {
  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => GraphQLJSON)
  config!: Record<string, unknown>;

  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String, { nullable: true })
  absolutePath?: string | null;

  @Field(() => String)
  kind!: "filesystem" | "skill" | "temp";

  @Field(() => Boolean)
  isTemp!: boolean;
}

@InputType()
export class CreateWorkspaceInput {
  @Field(() => String)
  rootPath!: string;
}

@InputType()
export class RemoveWorkspaceInput {
  @Field(() => String)
  workspaceId!: string;
}

@ObjectType()
export class RemoveWorkspaceResultInfo {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String, { nullable: true })
  workspaceRootPath!: string | null;
}

@Resolver()
export class WorkspaceResolver {
  private get workspaceManager() {
    return getWorkspaceManager();
  }

  @Query(() => [WorkspaceMetadataInfo])
  async workspaces(): Promise<WorkspaceMetadataInfo[]> {
    try {
      await this.workspaceManager.getOrCreateTempWorkspace();
      const workspaces = await this.workspaceManager.listVisibleWorkspaces();
      return workspaces.map((workspace) => WorkspaceConverter.toGraphql(workspace));
    } catch (error) {
      logger.error(`Failed to fetch all workspaces: ${String(error)}`);
      throw new Error("Unable to fetch workspaces at this time.");
    }
  }

  @Query(() => WorkspaceMetadataInfo)
  async workspaceMetadata(
    @Arg("rootPath", () => String) rootPath: string,
  ): Promise<WorkspaceMetadataInfo> {
    try {
      const workspaceRootPath = canonicalizeWorkspaceRootPath(rootPath);
      const displayName = workspaceDisplayNameFromRootPath(workspaceRootPath);
      return {
        workspaceId: buildFilesystemWorkspaceId(workspaceRootPath),
        name: displayName,
        displayName,
        config: { rootPath: workspaceRootPath },
        workspaceRootPath,
        absolutePath: workspaceRootPath,
        kind: "filesystem",
        isTemp: false,
      };
    } catch (error) {
      logger.error(`Failed to resolve workspace metadata: ${String(error)}`);
      throw new Error(String(error));
    }
  }

  @Mutation(() => WorkspaceMetadataInfo)
  async createWorkspace(
    @Arg("input", () => CreateWorkspaceInput) input: CreateWorkspaceInput,
  ): Promise<WorkspaceMetadataInfo> {
    logger.info("GraphQL mutation to create workspace metadata");
    try {
      const workspace = await this.workspaceManager.createWorkspace({ rootPath: input.rootPath });
      return WorkspaceConverter.toGraphql(workspace);
    } catch (error) {
      logger.error(`Unexpected error creating workspace metadata: ${String(error)}`);
      throw new Error(String(error));
    }
  }

  @Mutation(() => RemoveWorkspaceResultInfo)
  async removeWorkspace(
    @Arg("input", () => RemoveWorkspaceInput) input: RemoveWorkspaceInput,
  ): Promise<RemoveWorkspaceResultInfo> {
    logger.info("GraphQL mutation to remove registered workspace");
    try {
      return await this.workspaceManager.removeRegisteredWorkspace(input.workspaceId);
    } catch (error) {
      logger.error(`Unexpected error removing workspace: ${String(error)}`);
      return {
        success: false,
        message: String(error),
        workspaceId: input.workspaceId,
        workspaceRootPath: null,
      };
    }
  }
}
