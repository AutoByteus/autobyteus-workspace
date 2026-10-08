import {
  Arg,
  Field,
  InputType,
  Int,
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
  CLOSED = "CLOSED",
}

registerEnumType(ProjectTaskStatus, {
  name: "ProjectTaskStatus",
});

@ObjectType()
export class ProjectTaskContextFile {
  @Field(() => String) storedFilename!: string;
  @Field(() => String) displayName!: string;
  @Field(() => String) mimeType!: string;
  @Field(() => Int) sizeBytes!: number;
  @Field(() => String) locator!: string;
}
@InputType()
export class ProjectTaskContextDraftInput {
  @Field(() => String) draftId!: string;
  @Field(() => [String]) storedFilenames!: string[];
}
@InputType()
export class ProjectTaskContextChangesInput {
  @Field(() => String, {nullable: true}) draftId?: string;
  @Field(() => [String], {nullable: true}) addStoredFilenames?: string[];
  @Field(() => [String], {nullable: true}) removeStoredFilenames?: string[];
}

@ObjectType()
export class TaskRootHost {
  @Field(() => String) kind!: string;
  @Field(() => String) runId!: string;
}
@ObjectType()
export class TaskRootStartError {
  @Field(() => String) code!: string;
  @Field(() => String) message!: string;
}
/** The one agent or team a Task was handed to (its latest assignment), with the worker's own live status. */
@ObjectType()
export class TaskRoot {
  @Field(() => String) kind!: string;
  @Field(() => String, { nullable: true }) recipientAddress!: string | null;
  @Field(() => String) ingressAgentRunId!: string;
  @Field(() => String, { nullable: true }) teamRunId!: string | null;
  @Field(() => TaskRootHost) hostRoot!: TaskRootHost;
  @Field(() => String) start!: string;
  @Field(() => TaskRootStartError, { nullable: true }) startError!: TaskRootStartError | null;
  @Field(() => Boolean) closed!: boolean;
  @Field(() => String) status!: string;
}

@ObjectType()
export class ProjectTask {
  @Field(() => TaskRoot, { nullable: true }) root!: TaskRoot | null;
  @Field(() => [ProjectTaskContextFile]) contextFiles!: ProjectTaskContextFile[];
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
  @Field(() => ProjectTaskContextDraftInput, {nullable: true}) contextDraft?: ProjectTaskContextDraftInput;
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  description!: string;
}

@InputType()
export class UpdateProjectTaskInput {
  @Field(() => ProjectTaskContextChangesInput, {nullable: true}) contextChanges?: ProjectTaskContextChangesInput;
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

/** A Task with no Project ("Temp task"); read only. */
@ObjectType()
export class TaskWithoutProject {
  @Field(() => String) taskId!: string;
  @Field(() => String) description!: string;
  @Field(() => ProjectTaskStatus) status!: ProjectTaskStatus;
  @Field(() => [String]) referenceFiles!: string[];
  @Field(() => String) createdAt!: string;
  @Field(() => String) updatedAt!: string;
  @Field(() => TaskRoot, { nullable: true }) root!: TaskRoot | null;
}

const toGraphqlTask = (task: ProjectTaskView): ProjectTask => ({
  root: task.root,
  contextFiles: task.contextFiles,
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

  @Query(() => [TaskWithoutProject])
  async tasksWithoutProject(): Promise<TaskWithoutProject[]> {
    return withProjectErrors(async () => (await this.service.listTasksWithoutProject()).map((task) => ({
      ...task, status: task.status as ProjectTaskStatus,
    })));
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
    return withProjectErrors(async () => toGraphqlTask(await this.service.updateTask(input)));
  }

  @Mutation(() => Boolean)
  async deleteProjectTask(
    @Arg("input", () => DeleteProjectTaskInput) input: DeleteProjectTaskInput,
  ): Promise<boolean> {
    return withProjectErrors(() => this.service.deleteTask(input));
  }
}
