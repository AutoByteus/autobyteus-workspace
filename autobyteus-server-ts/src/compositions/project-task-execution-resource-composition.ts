import path from "node:path";
import type { TaskExecutionResourcePort } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import { findTaskRunControl } from "../agent-collaboration/execution/task/task-run-control.js";
import { DelegationTree } from "../agent-collaboration/delegation/delegation-tree.js";
import { bindDelegationTree, unbindDelegationTree } from "../agent-collaboration/delegation/delegation-tree-binding.js";
import { getChildRowsFeed } from "../agent-collaboration/delegation/child-rows-feed.js";
import { RunOwnAgentsReader } from "../run-history/store/run-own-agents-reader.js";
import { TaskExecutionResourceService } from "../projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../projects/stores/task-execution-resource-store.js";
import { ProjectsLayout } from "../projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore } from "../projects/stores/ad-hoc-task-store.js";
import { getProjectService } from "../projects/services/project-service.js";
import { getProjectChangePublisher, type ProjectChangeMarks } from "../projects/changes/project-change-publisher.js";
import { getProjectChangeHub } from "../projects/changes/project-change-hub.js";
import {
  initializeProjectTaskServiceProcessInstance,
  releaseProjectTaskServiceProcessInstance,
} from "../projects/services/project-task-service.js";
import {
  initializeProjectTaskSearchService,
  processProjectTaskSearchCleanup,
  processProjectTaskSearchMarks,
  releaseProjectTaskSearchService,
} from "../projects/search/project-task-search-service.js";
import { getEmbeddingIndex, shutdownEmbeddingIndex } from "../embeddings/embedding-index.js";
import { composeProjectRunLinks } from "./project-run-links-composition.js";
import { bindDelegatedRuns, unbindDelegatedRuns } from "../run-history/services/delegated-run-agents-reader.js";

/** The run links binding of the composed Task resources, released with them. */
let projectRunLinks: Readonly<{ close(): void }> | null = null;
/** The process `DelegationTree` (contract §2.6), built from the loaded Task records and released with them. */
let delegationTree: DelegationTree | null = null;
/** The open views' child-row feed following that tree (DS-8, SR-042). */
let unfollowChildRows: (() => void) | null = null;

/**
 * The Task service's post-commit marks: the `/ws/projects` publisher, and Project Task search for Task writes and
 * deletes (its fingerprints go stale; a write is indexed soon after). Each recipient never throws.
 */
const taskChangeMarks: ProjectChangeMarks = {
  taskChanged: (location) => { getProjectChangePublisher().taskChanged(location); processProjectTaskSearchMarks.taskChanged(location); },
  workerStatusChanged: (location) => getProjectChangePublisher().workerStatusChanged(location),
  taskRemoved: (location) => { getProjectChangePublisher().taskRemoved(location); processProjectTaskSearchMarks.taskRemoved(location); },
  projectChanged: (projectId) => getProjectChangePublisher().projectChanged(projectId),
  projectRemoved: (projectId) => getProjectChangePublisher().projectRemoved(projectId),
};

/**
 * The one place Projects and collaboration runtime are bound. It loads the Task agent run resource
 * view of both Task roots (`projects/` and `ad-hoc-tasks/`) once (after app-data migrations; a
 * damaged file is non-fatal), initializes the Task service process instance with an exact-root stop
 * request, initializes Project Task search over it (nothing is loaded until the first search), and returns the
 * neutral port roots receive.
 */
export const composeProjectTaskExecutionResources = async (deps: Readonly<{
  appDataDir: string;
  memoryDir: string;
}>): Promise<TaskExecutionResourcePort> => {
  const adHocTasksLayout = new AdHocTasksLayout(path.join(deps.appDataDir, "ad-hoc-tasks"));
  const projectsLayout = new ProjectsLayout(path.join(deps.appDataDir, "projects"));
  const taskExecutionResources = new TaskExecutionResourceService(new TaskExecutionResourceStore(projectsLayout, adHocTasksLayout));
  await taskExecutionResources.load();
  // The relationships between runs, from the Task records (TC-11); kept current inside each Task's ordered change (AR-017).
  // A run's agents are read from its own parts on the first need, never at startup (469 D-11).
  if (delegationTree) unbindDelegationTree(delegationTree);
  delegationTree = new DelegationTree(() => taskExecutionResources, () => new RunOwnAgentsReader(deps.memoryDir));
  delegationTree.build();
  taskExecutionResources.setEntriesListener(delegationTree);
  bindDelegationTree(delegationTree);
  unfollowChildRows?.();
  unfollowChildRows = getChildRowsFeed().follow(delegationTree);
  projectRunLinks?.close();
  projectRunLinks = await composeProjectRunLinks({ projectsLayout });
  const service = initializeProjectTaskServiceProcessInstance({
    taskExecutionResources,
    adHocTasks: new AdHocTaskStore(adHocTasksLayout),
    // DS-5: a closed Task's run stops by its own identity, through its ordinary Stop; its live status is its own.
    requestRelease: (run) => findTaskRunControl()?.stopForTaskClosure(run) ?? null,
    workerStatus: (run) => findTaskRunControl()?.ownStatus(run) ?? null,
    searchCleanup: processProjectTaskSearchCleanup,
    changes: taskChangeMarks,
  });
  // Search reads the Task service's current Tasks; the embedding index is created at the first search or cleanup.
  initializeProjectTaskSearchService({
    listProjects: () => getProjectService().listProjectSummaries(),
    listTasks: (projectId) => service.listTasks(projectId),
    index: getEmbeddingIndex,
  });
  // The `/ws/projects` feed: views are built from the services' committed state, after `load()`.
  // Readers of closed delegated runs (Team tab names, token totals) ask the same Task side (D-5, D-7).
  bindDelegatedRuns(delegationTree);
  getProjectChangePublisher().bind({
    readProject: (projectId) => getProjectService().getProject(projectId),
    readTask: (location) => service.readTaskChangeView(location),
    readWorkerStatus: (location) => service.workerStatusOf(location),
  }, (message) => getProjectChangeHub().broadcast(message));
  return service;
};

/** Host close and startup rollback release the process binding composed above. */
export const releaseProjectTaskExecutionResources = (port: TaskExecutionResourcePort): void => {
  projectRunLinks?.close();
  projectRunLinks = null;
  if (delegationTree) { unbindDelegationTree(delegationTree); unbindDelegatedRuns(delegationTree); }
  delegationTree = null;
  unfollowChildRows?.();
  unfollowChildRows = null;
  getProjectChangePublisher().unbind();
  releaseProjectTaskSearchService();
  void shutdownEmbeddingIndex().catch((error: unknown) => console.warn("EMBEDDING_INDEX_SHUTDOWN_FAILED", error));
  releaseProjectTaskServiceProcessInstance(port);
};
