import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { FlatTeamExecutionCallbacks } from "../../../src/agent-team-execution/local/flat-team-execution-callbacks.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { AgentOrgTeamExecutionDirectory } from "../../../src/agent-org-execution/services/agent-org-team-execution-directory.js";
import { AgentOrgRootAgentExecutionRegistry } from "../../../src/agent-org-execution/services/agent-org-root-agent-execution-registry.js";
import { testAgentNode } from "../../fixtures/current-team-run-fixtures.js";
import { flushMicrotasks, observeConfiguredHandles, taskTeamNode } from "./helpers/task-publication-handles.js";

const root = createAgentOrgRootExecutionIdentity("org-task-publication");
const message = new AgentInputUserMessage("Exact task packet");
const teamInput = (id: string) => ({ taskId: `task-${id}`, address: "/target" as const,
  teamRunId: id, teamNode: taskTeamNode(id), handoffs: [], message });
afterEach(() => vi.restoreAllMocks());

describe("Org-root prepared task publishers", () => {
  it("forwards root task-Team and recursively materialized Team/Agent events after ordered durable release", async () => {
    const handles = observeConfiguredHandles();
    const seen: string[] = [];
    const callbacks: FlatTeamExecutionCallbacks = {
      buildMemberExecutionContext: vi.fn(async () => ({} as never)),
      commitPlatformBindingChange: vi.fn(),
      publishAgentEvent: vi.fn((identity, event) => {
        expect(identity.root).toEqual(root);
        if (event.kind !== "status_overlay") throw new Error("Expected exact status event");
        expect(event.snapshot.execution).toEqual(identity);
        seen.push(`${identity.agentRunId}:${event.snapshot.details.status}`);
        // A publication during the initial flush must follow all already retained events.
        if (seen.at(-1) === "parent-lead:initializing") handles.get("parent-lead")!.emit("idle");
      }),
    };
    const directory = new AgentOrgTeamExecutionDirectory(new FlatTeamExecutionFactory());
    const prepared = await directory.prepareRootTaskTeam({ task: teamInput("parent"),
      physicalScope: { root, ancestorTeamRunIds: ["parent"] }, callbacks });
    const registration = directory.reserveTaskSubtree(prepared.preparedTeamRuns);
    expect(seen).toEqual([]);
    prepared.sealForCommit();
    const committed = prepared.commitAfterDurability();
    registration.commit();
    expect(seen).toEqual([]);
    seen.push("activated");
    committed.releaseWork(); committed.releaseWork();
    expect(seen).toEqual(["activated", "parent-lead:initializing", "parent-lead:idle", "parent-lead:idle"]);
    await flushMicrotasks();
    expect(handles.get("parent-lead")!.handle.postMessage).toHaveBeenCalledExactlyOnceWith(message);
    expect(seen.at(-1)).toBe("parent-lead:running");

    // These concrete child factories captured the same parent callback at materialization.
    let parent = directory.require("parent");
    for (const id of ["child", "grandchild"]) {
      const task = await parent.prepareTaskTeam(teamInput(id));
      const childRegistration = directory.reserveTaskSubtree(task.preparedTeamRuns);
      task.sealForCommit(); const release = task.commitAfterDurability(); childRegistration.commit();
      const before = seen.length;
      seen.push(`${id}:activated`);
      release.releaseWork(); release.releaseWork();
      await flushMicrotasks();
      const execution = handles.get(`${id}-lead`)!;
      execution.emit("idle"); execution.emit("offline");
      expect(seen.slice(before)).toEqual([`${id}:activated`, `${id}-lead:running`, `${id}-lead:idle`, `${id}-lead:offline`]);
      expect(execution.handle.postMessage).toHaveBeenCalledExactlyOnceWith(message);
      expect(execution.input.identity.memberAddress).toBe("/target/lead");
      expect(execution.input.physicalScope.ancestorTeamRunIds).toEqual(id === "child" ? ["parent", "child"] : ["parent", "child", "grandchild"]);
      parent = directory.require(id);
    }
    const leaf = await parent.prepareTaskAgent({ taskId: "leaf", address: "/worker", agentRunId: "leaf-agent",
      sourceNode: testAgentNode("/worker"), message });
    leaf.sealForCommit(); const release = leaf.commitAfterDurability();
    const before = seen.length;
    seen.push("leaf:activated"); release.releaseWork(); release.releaseWork();
    await flushMicrotasks(); handles.get("leaf-agent")!.emit("idle");
    expect(seen.slice(before)).toEqual(["leaf:activated", "leaf-agent:initializing", "leaf-agent:idle", "leaf-agent:running", "leaf-agent:idle"]);
    expect(handles.get("leaf-agent")!.handle.postMessage).toHaveBeenCalledOnce();
  });

  it.each(["agent", "team"] as const)("keeps aborted %s preparation and subsequent callbacks private", async (kind) => {
    const handles = observeConfiguredHandles();
    const forward = vi.fn();
    const callbacks = { publishAgentEvent: forward, buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn() };
    const prepared = kind === "team"
      ? await new AgentOrgTeamExecutionDirectory(new FlatTeamExecutionFactory()).prepareRootTaskTeam({
          task: teamInput("aborted"), physicalScope: { root, ancestorTeamRunIds: ["aborted"] }, callbacks })
      : await new AgentOrgRootAgentExecutionRegistry({ root, callbacks }).prepareTask({
          taskId: "aborted", address: "/worker", agentRunId: "aborted-agent", sourceNode: testAgentNode("/worker"), message });
    prepared.sealForCommit(); await prepared.abort(); await prepared.abort();
    for (const execution of handles.values()) {
      execution.emit("offline"); execution.emit("running");
      expect(execution.handle.postMessage).not.toHaveBeenCalled();
    }
    expect(() => prepared.commitAfterDurability()).toThrow();
    expect(forward).not.toHaveBeenCalled();
  });

  it.each(["agent", "team"] as const)("closes the %s publisher when preparation rejects", async (kind) => {
    const failure = new Error("Provider preparation rejected");
    const handles = observeConfiguredHandles(failure);
    const forward = vi.fn();
    const callbacks = { publishAgentEvent: forward, buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn() };
    const prepare = kind === "team"
      ? new AgentOrgTeamExecutionDirectory(new FlatTeamExecutionFactory()).prepareRootTaskTeam({
          task: teamInput("failed"), physicalScope: { root, ancestorTeamRunIds: ["failed"] }, callbacks })
      : new AgentOrgRootAgentExecutionRegistry({ root, callbacks }).prepareTask({
          taskId: "failed", address: "/worker", agentRunId: "failed-agent", sourceNode: testAgentNode("/worker"), message });
    await expect(prepare).rejects.toBe(failure);
    for (const execution of handles.values()) {
      execution.emit("idle");
      expect(execution.handle.postMessage).not.toHaveBeenCalled();
    }
    expect(forward).not.toHaveBeenCalled();
  });

  it("releases only the exact root-Agent preparation once and then forwards live events", async () => {
    const handles = observeConfiguredHandles();
    const seen: string[] = [];
    const callbacks = { buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn(),
      publishAgentEvent: vi.fn<FlatTeamExecutionCallbacks["publishAgentEvent"]>((identity, event) => {
        expect(identity.root).toEqual(root); expect(identity.memberAddress).toBe("/worker");
        if (event.kind === "status_overlay") seen.push(`${identity.agentRunId}:${event.snapshot.details.status}`);
      }) };
    const registry = new AgentOrgRootAgentExecutionRegistry({ root, callbacks });
    const prepare = (id: string) => registry.prepareTask({ taskId: id, address: "/worker", agentRunId: id, sourceNode: testAgentNode("/worker"), message });
    const first = await prepare("first"); const second = await prepare("second");
    first.sealForCommit(); const commit = first.commitAfterDurability();
    expect(seen).toEqual([]); expect(registry.listHandles()).toHaveLength(1);
    seen.push("activated"); commit.releaseWork(); commit.releaseWork();
    await flushMicrotasks(); handles.get("first")!.emit("idle"); handles.get("first")!.emit("offline");
    handles.get("second")!.emit("running");
    expect(seen).toEqual(["activated", "first:initializing", "first:idle", "first:running", "first:idle", "first:offline"]);
    expect(handles.get("first")!.handle.postMessage).toHaveBeenCalledExactlyOnceWith(message);
    expect(handles.get("second")!.handle.postMessage).not.toHaveBeenCalled();
    await second.abort(); expect(seen).toHaveLength(6);
  });
});
