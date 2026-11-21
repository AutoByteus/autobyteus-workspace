import type { OnDemandModels, StoredModelOffer, StoredModelOfferCheck } from "../../src/llm-management/services/run-model-selection-service.js";
import type { StoredModelStartChecks } from "../../src/llm-management/services/run-model-selection-refusal.js";
import { ConfiguredAgentExecutionFactory } from "../../src/agent-collaboration/execution/backends/configured-agent-execution-factory.js";
import type { RemoteRunChannelAccess } from "../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { RemoteFiles } from "../../src/agent-collaboration/execution/remote/transferred-files.js";
import type { ReceivedFiles } from "../../src/remote-collaboration/inbound/received-files.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../../src/agent-collaboration/execution/remote/remote-refusal-codes.js";
import type { PeerDiscoveryAccess } from "../../src/agent-collaboration/execution/remote/peer-discovery-channel.js";
import { runIdentityOf, type TaskExecutionReleaseRequest } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { REMOTE_COLLABORATION_OFF_DISCOVERY } from "../../src/agent-tools/agent-discovery/agent-discovery-refusal.js";
import type { ProjectTaskSearchCleanup } from "../../src/projects/search/project-task-search-service.js";
import {
  initializeProjectTaskServiceProcessInstance,
  getProjectTaskService,
  releaseProjectTaskServiceProcessInstance,
  type ProjectTaskService,
} from "../../src/projects/services/project-task-service.js";
import type { TaskDisplayNameResolver, TaskTopRunResolver, TaskWorkerStatusResolver } from "../../src/projects/services/task-root-view-builder.js";

/**
 * The explicit values a test passes where a host would compose its collaborators (autobyteus-500 FU-011, FU-018): a host
 * without peer nodes, and a Task service whose runs are stopped by nobody. Each is a value the test states, never an
 * absent collaborator.
 */
export const NO_PEER_CHANNEL: RemoteRunChannelAccess = () => null;
export const OFF_DISCOVERY: PeerDiscoveryAccess = () => REMOTE_COLLABORATION_OFF_DISCOVERY;
/**
 * autobyteus-587: the file transfer of a host without peer nodes, as its composition builds it (its channel answers
 * null): any file to send is refused, a delivery without files names none, and no file is ever received.
 */
export const NO_REMOTE_FILES: RemoteFiles = Object.freeze({
  outgoing: Object.freeze({
    send: async (input: Readonly<{ referenceFiles: readonly string[] | null | undefined }>) => input.referenceFiles?.some((file) => file.trim())
      ? Object.freeze({ ok: false as const, refusal: Object.freeze({ accepted: false as const, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off }) })
      : Object.freeze({ ok: true as const, files: Object.freeze([]) }),
  }),
  received: Object.freeze({
    planFor: (input: Readonly<{ files: readonly unknown[] }>) => {
      if (input.files.length) throw new Error("A host without peer nodes receives no file.");
      return Object.freeze({ paths: Object.freeze([]), place: async () => Object.freeze({ ok: true as const }) });
    },
  }),
});

/**
 * autobyteus-587: a node's received files in a test that sends it none: a peer's status or piece is not expected, a
 * message that names a file is refused as not received (as a node that holds none of it would), and a sweep (after a
 * history delete, or at startup) has nothing to remove.
 */
export const NO_FILES_RECEIVED: Pick<ReceivedFiles, "status" | "appendPiece" | "verify" | "sweep"> = Object.freeze({
  sweep: async () => undefined,
  status: async () => { throw new Error("This test sends this node no files."); },
  appendPiece: async () => { throw new Error("This test sends this node no files."); },
  verify: async (files: readonly Readonly<{ name: string }>[]) => files.length
    ? Object.freeze({ ok: false as const, name: files[0]!.name }) : Object.freeze({ ok: true as const }),
});

/** A Task service's run-side ports for a test with no running roots: no stop is asked, a run is its own top. */
export const NO_RUN_SIDE_TASK_PORTS: Readonly<{
  requestRelease: TaskExecutionReleaseRequest;
  workerStatus: TaskWorkerStatusResolver;
  topRun: TaskTopRunResolver;
  displayName: TaskDisplayNameResolver;
  searchCleanup: ProjectTaskSearchCleanup;
}> = Object.freeze({
  requestRelease: () => null,
  workerStatus: () => null,
  topRun: runIdentityOf,
  displayName: () => null,
  searchCleanup: Object.freeze({ forgetTask: () => undefined, forgetProject: () => undefined }),
});

/** The standalone runs of a test with no eligible runs: every answer is "not eligible", as an application scope's. */
export { APPLICATION_HOST_STANDALONE_RUNS as NO_ELIGIBLE_STANDALONE_RUNS } from "../../src/agent-execution/services/standalone-run-ports.js";

let processTaskService: ProjectTaskService | null = null;
/**
 * A fresh process Task service for a test that drives the Task tools through the process instance, as the composition
 * initializes it (`composeCollaboration`), with no running roots. Releases the one this helper made before.
 */
export const freshProcessTaskService = (): ProjectTaskService => {
  if (processTaskService) releaseProjectTaskServiceProcessInstance(processTaskService);
  processTaskService = initializeProjectTaskServiceProcessInstance({ ...NO_RUN_SIDE_TASK_PORTS });
  return processTaskService;
};

/**
 * Releases the process Task service a composition (a test server's `composeCollaboration`) or a test made, if there is one.
 * Before a composition there is none: the process getter throws (FU-011), so a reset that runs before a server starts has
 * nothing to release.
 */
export const releaseComposedProjectTaskService = (): void => {
  let composed: ProjectTaskService;
  try {
    composed = getProjectTaskService();
  } catch (error) {
    if (error instanceof Error && error.message.includes("is created by the composition")) return;
    throw error;
  }
  releaseProjectTaskServiceProcessInstance(composed);
  if (processTaskService === composed) processTaskService = null;
};

/** G-5: a test whose stored models are all offered (the start proceeds as before the check). */
export const OFFERED_STORED_MODEL_OFFER = async (): Promise<StoredModelOffer> => "offered";
export const OFFERED_STORED_MODELS: StoredModelOfferCheck = Object.freeze({ storedModelOffer: OFFERED_STORED_MODEL_OFFER });
/** G-5 (SR-015 R2): every run's agent definition exists, so the model check speaks. */
export const EXISTING_AGENT_DEFINITIONS: StoredModelStartChecks["agentDefinitions"] = Object.freeze({
  getAgentDefinitionById: async (id: string) => ({ id } as Awaited<ReturnType<StoredModelStartChecks["agentDefinitions"]["getAgentDefinitionById"]>>),
});
export const OFFERED_STORED_MODEL_CHECKS: StoredModelStartChecks = Object.freeze({ agentDefinitions: EXISTING_AGENT_DEFINITIONS,
  storedModels: OFFERED_STORED_MODELS });
export const OFFERED_MODEL_EXECUTION_FACTORY = new ConfiguredAgentExecutionFactory({ storedModelChecks: OFFERED_STORED_MODEL_CHECKS });
/** SR-015 R1: no on-demand AutoByteus model in the test (its start reads the runtime's list as before). */
export const NO_ON_DEMAND_MODELS: OnDemandModels = Object.freeze({ loadOnDemandModel: async () => "not_on_demand" as const });
