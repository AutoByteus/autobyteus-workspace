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
import type { ProjectTaskView } from "../../../projects/domain/models.js";
import { getProjectTaskService } from "../../../projects/services/project-task-service.js";
import { withProjectErrors } from "./projects.js";

export enum ProjectTaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
}

registerEnumType(ProjectTaskStatus, {
  name: "ProjectTaskStatus",
});

@ObjectType()
export class ProjectTask {
  @Field(() => String)
  taskId!: string;

  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  description!: string;

  @Field(() => ProjectTaskStatus)
  status!: ProjectTaskStatus;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

@InputType()
export class CreateProjectTaskInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  description!: string;
}

@InputType()
export class UpdateProjectTaskInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  taskId!: string;

  @Field(() => String)
  description!: string;
}

@InputType()
export class DeleteProjectTaskInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  taskId!: string;
}

const toGraphqlTask = (task: ProjectTaskView): ProjectTask => ({
  taskId: task.taskId,
  projectId: task.projectId,
  description: task.description,
  status: task.status as ProjectTaskStatus,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

/**
 * Transport for Project Tasks. There is deliberately no status mutation here:
 * users only create, edit the description of, and delete Tasks.
 */
@Resolver()
export class ProjectTaskResolver {
  private get service() {
    return getProjectTaskService();
  }

  @Query(() => [ProjectTask])
  async projectTasks(@Arg("projectId", () => String) projectId: string): Promise<ProjectTask[]> {
    return withProjectErrors(async () => (await this.service.listTasks(projectId)).map(toGraphqlTask));
  }

  @Mutation(() => ProjectTask)
  async createProjectTask(
    @Arg("input", () => CreateProjectTaskInput) input: CreateProjectTaskInput,
  ): Promise<ProjectTask> {
    return withProjectErrors(async () => toGraphqlTask(await this.service.createTask(input)));
  }

  @Mutation(() => ProjectTask)
  async updateProjectTask(
    @Arg("input", () => UpdateProjectTaskInput) input: UpdateProjectTaskInput,
  ): Promise<ProjectTask> {
    return withProjectErrors(async () => toGraphqlTask(await this.service.updateTaskDescription(input)));
  }

  @Mutation(() => Boolean)
  async deleteProjectTask(
    @Arg("input", () => DeleteProjectTaskInput) input: DeleteProjectTaskInput,
  ): Promise<boolean> {
    return withProjectErrors(() => this.service.deleteTask(input));
  }
}
