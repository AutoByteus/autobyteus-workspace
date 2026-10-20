import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { PeerDirectory } from "../../../src/remote-collaboration/settings/peer-directory.js";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";
import { PublishedAgentService } from "../../../src/remote-collaboration/settings/published-agent-service.js";
import { PublishedAgentStore } from "../../../src/remote-collaboration/settings/published-agent-store.js";
import { PublishedLaunchCheck } from "../../../src/remote-collaboration/settings/published-launch-check.js";
import { RemoteCollaborationCapability } from "../../../src/remote-collaboration/settings/remote-collaboration-capability.js";

/** Design § On-Disk Data Model files 1–3; REQ-101, REQ-102, REQ-103 (DS-004). */

const SELF = "srv_self_node_000000000000000000000000";
const B = "srv_peer_b_00000000000000000000000000";
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const dataDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "remote-collab-settings-")); roots.push(dir);
  return dir;
};
const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));

describe("RemoteCollaborationCapability (the switch)", () => {
  it("is off unless ENABLE_REMOTE_COLLABORATION is true, and is written through the settings mechanism", () => {
    const values = new Map<string, boolean>();
    const capability = new RemoteCollaborationCapability({
      getBooleanSetting: (key) => values.get(key) ?? null,
      setBooleanSetting: (key, value) => { values.set(key, value); },
    });
    expect(capability.getState()).toEqual({ enabled: false, settingKey: "ENABLE_REMOTE_COLLABORATION", source: "DEFAULT_DISABLED" });
    capability.setEnabled(true);
    expect(values.get("ENABLE_REMOTE_COLLABORATION")).toBe(true);
    expect(capability.isEnabled()).toBe(true);
    expect(capability.getState().source).toBe("SERVER_SETTING");
  });
});

describe("PeerDirectory", () => {
  const directory = async (input: { enabled?: boolean; identity?: string } = {}) => {
    const dir = await dataDir();
    const store = new PeerStore({ getAppDataDir: () => dir });
    const probe = { fetchServerInstanceId: vi.fn(async () => input.identity ?? B) };
    const peers = new PeerDirectory({ store, probe, capability: { isEnabled: () => input.enabled ?? true },
      ownNodeId: async () => SELF, now: () => new Date("2026-10-20T09:00:00.000Z") });
    return { dir, store, probe, peers };
  };

  it("registers a peer by URL and name, pinning the identity behind the URL, in peers.json with exact keys", async () => {
    const f = await directory();
    await expect(f.peers.add({ baseUrl: "localhost:29700/rest", name: "docker" })).resolves.toEqual({
      nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z" });
    expect(f.probe.fetchServerInstanceId).toHaveBeenCalledWith("http://localhost:29700");
    expect(await readJson(path.join(f.dir, "remote-collaboration", "peers.json"))).toEqual({ peers: [
      { nodeId: B, name: "docker", baseUrl: "http://localhost:29700", addedAt: "2026-10-20T09:00:00.000Z" }] });
    await expect(f.peers.findByName("DOCKER")).resolves.toMatchObject({ nodeId: B });
    await expect(f.peers.findByNodeId(B)).resolves.toMatchObject({ name: "docker" });
  });

  it("refuses to contact a URL while the switch is off, a URL that is this node, a node registered twice and a taken name", async () => {
    const off = await directory({ enabled: false });
    await expect(off.peers.add({ baseUrl: "http://b", name: "b" })).rejects.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
    expect(off.probe.fetchServerInstanceId).not.toHaveBeenCalled();
    const self = await directory({ identity: SELF });
    await expect(self.peers.add({ baseUrl: "http://me", name: "me" })).rejects.toMatchObject({ code: "PEER_IS_THIS_NODE" });
    const f = await directory();
    await f.peers.add({ baseUrl: "http://b", name: "docker" });
    await expect(f.peers.add({ baseUrl: "http://b-again", name: "other" })).rejects.toMatchObject({ code: "PEER_ALREADY_REGISTERED" });
    await expect(f.peers.add({ baseUrl: "http://c", name: "Docker" })).rejects.toMatchObject({ code: "PEER_NAME_TAKEN" });
    await expect(f.peers.add({ baseUrl: "http://c", name: "/bad" })).rejects.toMatchObject({ code: "PEER_NAME_INVALID" });
    expect((await f.peers.list()).length).toBe(1);
  });

  it("renames (the name only) and removes a peer", async () => {
    const f = await directory();
    await f.peers.add({ baseUrl: "http://b", name: "docker" });
    await expect(f.peers.rename(B, "nas")).resolves.toMatchObject({ nodeId: B, name: "nas", baseUrl: "http://b" });
    await expect(f.peers.findByName("docker")).resolves.toBeNull();
    await f.peers.remove(B);
    expect(await f.peers.list()).toEqual([]);
    await expect(f.peers.remove(B)).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
  });
});

describe("PublishedAgentService", () => {
  const service = async (reason: string | null = null) => {
    const dir = await dataDir();
    const definitions = [
      new AgentDefinition({ id: "publisher", name: "Publisher", description: "Publishes", instructions: "x" }),
      new AgentDefinition({ id: "private-one", name: "Private", description: "x", instructions: "x", ownershipScope: "application_owned" as never }),
    ];
    const launchCheck = { reasonItCannotRun: vi.fn(async () => reason) } as unknown as PublishedLaunchCheck;
    const published = new PublishedAgentService({
      store: new PublishedAgentStore({ getAppDataDir: () => dir }),
      definitions: { getAgentDefinitionById: async (id) => definitions.find((definition) => definition.id === id) ?? null },
      launchCheck, now: () => new Date("2026-10-20T09:05:00.000Z"),
    });
    return { dir, published, launchCheck };
  };
  const launch = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, workspaceRootPath: "/work", autoExecuteTools: false };

  it("publishes nothing by default; publishing records the launch settings, and the address is derived from the published set", async () => {
    const f = await service();
    expect(await f.published.list()).toEqual([]);
    await f.published.publish("publisher", launch);
    expect(await readJson(path.join(f.dir, "remote-collaboration", "published-agents.json"))).toEqual({ publishedAgents: [{
      agentDefinitionId: "publisher", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", llmConfig: null,
      workspaceRootPath: "/work", autoExecuteTools: false, publishedAt: "2026-10-20T09:05:00.000Z" }] });
    expect(await f.published.findByAddress("/publisher")).toMatchObject({ definitionName: "Publisher", address: "/publisher", agent: { agentDefinitionId: "publisher" } });
    await f.published.update("publisher", { ...launch, autoExecuteTools: true });
    expect((await f.published.findByAddress("/publisher"))?.agent).toMatchObject({ autoExecuteTools: true, publishedAt: "2026-10-20T09:05:00.000Z" });
    await f.published.unpublish("publisher");
    expect(await f.published.findByAddress("/publisher")).toBeNull();
  });

  it("refuses an unknown or non-shared definition, a second publish, and launch settings that cannot run here", async () => {
    const f = await service();
    await expect(f.published.publish("nobody", launch)).rejects.toMatchObject({ code: "AGENT_NOT_FOUND" });
    await expect(f.published.publish("private-one", launch)).rejects.toMatchObject({ code: "AGENT_NOT_FOUND" });
    await f.published.publish("publisher", launch);
    await expect(f.published.publish("publisher", launch)).rejects.toMatchObject({ code: "AGENT_ALREADY_PUBLISHED" });
    const invalid = await service("The workspace '/nope' is not a folder on this node.");
    await expect(invalid.published.publish("publisher", { ...launch, workspaceRootPath: "/nope" }))
      .rejects.toMatchObject({ code: "LAUNCH_SETTINGS_INVALID", message: "The workspace '/nope' is not a folder on this node." });
    expect(await invalid.published.list()).toEqual([]);
  });
});

describe("PublishedLaunchCheck", () => {
  it("checks the workspace folder, the runtime and the model with the existing checks", async () => {
    const dir = await dataDir();
    const validator = { validate: vi.fn(async () => ({ kind: "valid" as const, selection: { llmModelIdentifier: "sonnet", llmConfig: null } })) };
    const availability = { getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => ({ runtimeKind, enabled: true, reason: null })) };
    const check = new PublishedLaunchCheck({ availability: availability as never, validator });
    const launch = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, workspaceRootPath: dir, autoExecuteTools: false };
    await expect(check.reasonItCannotRun(launch)).resolves.toBeNull();
    expect(validator.validate).toHaveBeenCalledWith({ context: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, currentModelIdentifier: "sonnet", workspaceRootPath: dir },
      selection: { llmModelIdentifier: "sonnet", llmConfig: null } });
    await expect(check.reasonItCannotRun({ ...launch, workspaceRootPath: "relative" })).resolves.toContain("not an absolute path");
    await expect(check.reasonItCannotRun({ ...launch, workspaceRootPath: path.join(dir, "missing") })).resolves.toContain("not a folder");
    availability.getRuntimeAvailability.mockResolvedValueOnce({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, enabled: false, reason: "Claude is not signed in." });
    await expect(check.reasonItCannotRun(launch)).resolves.toBe("Claude is not signed in.");
    validator.validate.mockResolvedValueOnce({ kind: "model_unavailable" } as never);
    await expect(check.reasonItCannotRun(launch)).resolves.toBe("The model 'sonnet' is not available on claude_agent_sdk.");
  });
});
