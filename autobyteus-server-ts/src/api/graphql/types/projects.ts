import { GraphQLError } from "graphql";
import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from "type-graphql";
import type { ProjectView, ProjectWorkspaceView } from "../../../projects/domain/models.js";
import { ProjectError } from "../../../projects/domain/project-errors.js";
import { getProjectService } from "../../../projects/services/project-service.js";

export enum ProjectWorkspaceAvailability {
  AVAILABLE = "AVAILABLE",
  UNREGISTERED = "UNREGISTERED",
}

registerEnumType(ProjectWorkspaceAvailability, {
  name: "ProjectWorkspaceAvailability",
});

@ObjectType()
export class ProjectWorkspace {
  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  workspaceRootPath!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  addedAt!: string;

  @Field(() => ProjectWorkspaceAvailability)
  availability!: ProjectWorkspaceAvailability;
}

@ObjectType()
export class Project {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;

  @Field(() => [ProjectWorkspace])
  workspaces!: ProjectWorkspace[];
}

@InputType()
export class CreateProjectInput {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;
}

@InputType()
export class UpdateProjectInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;
}

@InputType()
export class AddProjectWorkspaceInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;
}

@InputType()
export class UpdateProjectWorkspaceInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;
}

@InputType()
export class RemoveProjectWorkspaceInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  workspaceId!: string;
}

const toGraphqlWorkspace = (link: ProjectWorkspaceView): ProjectWorkspace => ({
  workspaceId: link.workspaceId,
  workspaceRootPath: link.workspaceRootPath,
  displayName: link.displayName,
  description: link.description,
  addedAt: link.addedAt,
  availability: link.availability as ProjectWorkspaceAvailability,
});

const toGraphqlProject = (project: ProjectView): Project => ({
  projectId: project.projectId,
  name: project.name,
  description: project.description,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  workspaces: project.workspaces.map(toGraphqlWorkspace),
});

const withProjectErrors = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ProjectError) {
      throw new GraphQLError(error.message, { extensions: { code: error.code } });
    }
    throw error;
  }
};

@Resolver()
export class ProjectResolver {
  private get service() {
    return getProjectService();
  }

  @Query(() => [Project])
  async projects(): Promise<Project[]> {
    return (await this.service.listProjects()).map(toGraphqlProject);
  }

  @Query(() => Project, { nullable: true })
  async project(@Arg("projectId", () => String) projectId: string): Promise<Project | null> {
    const project = await this.service.getProject(projectId);
    return project ? toGraphqlProject(project) : null;
  }

  @Mutation(() => Project)
  async createProject(
    @Arg("input", () => CreateProjectInput) input: CreateProjectInput,
  ): Promise<Project> {
    return withProjectErrors(async () => toGraphqlProject(await this.service.createProject(input)));
  }

  @Mutation(() => Project)
  async updateProject(
    @Arg("input", () => UpdateProjectInput) input: UpdateProjectInput,
  ): Promise<Project> {
    return withProjectErrors(async () => toGraphqlProject(await this.service.updateProject(input)));
  }

  @Mutation(() => Boolean)
  async deleteProject(@Arg("projectId", () => String) projectId: string): Promise<boolean> {
    return this.service.deleteProject(projectId);
  }

  @Mutation(() => Project)
  async addProjectWorkspace(
    @Arg("input", () => AddProjectWorkspaceInput) input: AddProjectWorkspaceInput,
  ): Promise<Project> {
    return withProjectErrors(async () => toGraphqlProject(await this.service.addWorkspaceLink(input)));
  }

  @Mutation(() => Project)
  async updateProjectWorkspace(
    @Arg("input", () => UpdateProjectWorkspaceInput) input: UpdateProjectWorkspaceInput,
  ): Promise<Project> {
    return withProjectErrors(async () => toGraphqlProject(await this.service.updateWorkspaceLink(input)));
  }

  @Mutation(() => Project)
  async removeProjectWorkspace(
    @Arg("input", () => RemoveProjectWorkspaceInput) input: RemoveProjectWorkspaceInput,
  ): Promise<Project> {
    return withProjectErrors(async () => toGraphqlProject(await this.service.removeWorkspaceLink(input)));
  }
}
