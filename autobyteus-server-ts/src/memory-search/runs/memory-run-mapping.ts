import type { DiscoveredRun } from "../../agent-memory/domain/discovered-run.js";
import type { MemoryRun } from "../domain/memory-search-models.js";

/**
 * A discovered run as the memory index keeps it: the facts memory search stores and shows, without the root, the
 * attribution and the recorded start (the episodic catalog's), so the stored run rows keep their shape. An AGENT
 * subject already carries the attributed definition (null otherwise), as discovery sets it.
 */
export const toMemoryRun = (run: DiscoveredRun): MemoryRun => ({
  runKey: run.runKey,
  runId: run.runId,
  memoryDir: run.memoryDir,
  agentName: run.agentName,
  teamName: run.teamName,
  memberName: run.memberName,
  orgName: run.orgName,
  workspace: run.workspace,
  runtimeKind: run.runtimeKind,
  subject: run.subject,
});
