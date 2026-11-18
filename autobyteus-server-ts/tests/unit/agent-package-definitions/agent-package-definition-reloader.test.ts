import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentPackageDefinitionStore } from "../../../src/agent-package-definitions/services/agent-package-definition-store.js";
import {
  AgentPackageDefinitionReloader,
  listsAffectedBy,
} from "../../../src/agent-package-definitions/services/agent-package-definition-reloader.js";
import type {
  AgentPackageDefinitionList,
  DefinitionFolderReader,
  AgentPackageDefinitionKind,
  RegisteredPackageRoot,
  DefinitionFolderReadResult,
} from "../../../src/agent-package-definitions/domain/agent-package-definition-types.js";

const ROOT: RegisteredPackageRoot = {
  rootPath: "/pkg",
  sourceClass: "registered_package",
  kindDirs: { agents: "/pkg/agents", "agent-teams": "/pkg/agent-teams", "agent-orgs": "/pkg/agent-orgs" },
};

type FakeFolder = { instructions: string } | "invalid";

class FakeReader<K extends AgentPackageDefinitionKind> implements DefinitionFolderReader<K> {
  readonly folders = new Map<string, FakeFolder>();
  reads = 0;
  failOn: string | null = null;
  constructor(readonly kind: K) {}
  async listFolderIds(): Promise<readonly string[]> { return [...this.folders.keys()]; }
  async readFolder(folderId: string): Promise<DefinitionFolderReadResult> {
    this.reads += 1;
    if (folderId === this.failOn) throw new Error("EIO");
    const folder = this.folders.get(folderId);
    if (!folder) return { status: "absent" };
    const location = { packageRoot: ROOT.rootPath, folderDir: `/pkg/${folderId}`, sourceClass: "registered_package" as const };
    if (folder === "invalid") {
      return { status: "read", location, nested: new Map(), root: { kind: this.kind, result: { status: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: "bad", definitionPath: "/p" } } as never };
    }
    return {
      status: "read", location, nested: new Map(),
      root: {
        kind: this.kind,
        result: { status: "valid", definition: new AgentDefinition({ id: folderId, name: folderId, description: "", instructions: folder.instructions }), fingerprint: folder.instructions },
      } as never,
    };
  }
}

const setup = (options: { quietMs?: number; capMs?: number; rootPresent?: () => boolean } = {}) => {
  const store = new AgentPackageDefinitionStore();
  const readers = {
    agent: new FakeReader("agent"),
    agent_team: new FakeReader("agent_team"),
    agent_org: new FakeReader("agent_org"),
  };
  const published: AgentPackageDefinitionList[][] = [];
  const reloader = new AgentPackageDefinitionReloader({
    store,
    readers,
    listPackageRoots: () => [ROOT],
    settleQuietMs: options.quietMs ?? 60_000,
    settleCapMs: options.capMs ?? 120_000,
    isRootPresent: async () => options.rootPresent?.() ?? true,
    logger: { warn: () => undefined },
  });
  reloader.setPublisher((changedLists) => published.push([...changedLists]));
  return { store, readers, reloader, published };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("listsAffectedBy", () => {
  it("names the lists affected by each changed kind, with their dependents", () => {
    expect(listsAffectedBy(["agent"], false)).toEqual(["agents", "agent_teams", "agent_orgs"]);
    expect(listsAffectedBy(["agent_team"], false)).toEqual(["agents", "agent_teams", "agent_orgs"]);
    expect(listsAffectedBy(["agent_org"], false)).toEqual(["agent_orgs"]);
    expect(listsAffectedBy([], true)).toEqual(["agent_packages"]);
  });
});

describe("AgentPackageDefinitionReloader", () => {
  it("populates once on the first read, shared by concurrent reads, without publishing", async () => {
    const { readers, reloader, store, published } = setup();
    readers.agent.folders.set("a", { instructions: "v1" });
    await Promise.all([reloader.applyPendingChanges(), reloader.applyPendingChanges(), reloader.applyPendingChanges()]);
    expect(readers.agent.reads).toBe(1);
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(published).toEqual([]);
    reloader.close();
  });

  it("applies a pending change before a read answers, inside the settle window (REQ-018)", async () => {
    const { readers, reloader, store, published } = setup();
    await reloader.applyPendingChanges();
    readers.agent.folders.set("new", { instructions: "v1" });
    reloader.markFolderChanged("agent", "new");
    await reloader.applyPendingChanges();
    expect(store.getDefinition("agent", "new")).not.toBeNull();
    expect(published).toEqual([["agents", "agent_teams", "agent_orgs"]]);
    reloader.close();
  });

  it("re-reads a folder a read applied mid-write once after the quiet window, even without a further event", async () => {
    vi.useFakeTimers();
    const { readers, reloader, store } = setup({ quietMs: 1000, capMs: 3000 });
    await reloader.applyPendingChanges();
    readers.agent.folders.set("a", { instructions: "v1" });
    await reloader.reloadFoldersNow("agent", ["a"]);
    // The file is caught half-written by a read; its completing write is not reported again.
    readers.agent.folders.set("a", "invalid");
    reloader.markFolderChanged("agent", "a");
    await reloader.applyPendingChanges();
    expect(store.getEntry("agent", "a")?.issue).not.toBeNull();
    readers.agent.folders.set("a", { instructions: "v2" });
    await reloader.applyPendingChanges();
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
    await vi.advanceTimersByTimeAsync(1000);
    await reloader.applyPendingChanges();
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v2");
    expect(store.getEntry("agent", "a")?.issue).toBeNull();
    reloader.close();
  });

  it("coalesces a burst into one reconcile and one publication after the quiet window", async () => {
    vi.useFakeTimers();
    const { readers, reloader, store, published } = setup({ quietMs: 1000, capMs: 3000 });
    await reloader.applyPendingChanges();
    for (let index = 0; index < 50; index += 1) {
      readers.agent.folders.set(`a${index}`, { instructions: "v1" });
      reloader.markFolderChanged("agent", `a${index}`);
      reloader.markFolderChanged("agent", `a${index}`);
      await vi.advanceTimersByTimeAsync(10);
    }
    expect(published).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    await reloader.applyPendingChanges();
    expect(published).toHaveLength(1);
    expect(store.listFolderRoots("agent")).toHaveLength(50);
    reloader.close();
  });

  it("caps the settle window for a continuous burst", async () => {
    vi.useFakeTimers();
    const { readers, reloader, published } = setup({ quietMs: 1000, capMs: 3000 });
    await reloader.applyPendingChanges();
    for (let index = 0; index < 40; index += 1) {
      readers.agent.folders.set(`a${index}`, { instructions: "v1" });
      reloader.markFolderChanged("agent", `a${index}`);
      await vi.advanceTimersByTimeAsync(100);
    }
    await reloader.applyPendingChanges();
    expect(published.length).toBeGreaterThanOrEqual(1);
    expect(published.length).toBeLessThanOrEqual(2);
    reloader.close();
  });

  it("does not publish when a reconcile changes nothing (in-app write echoes)", async () => {
    const { readers, reloader, published } = setup();
    readers.agent.folders.set("a", { instructions: "v1" });
    await reloader.applyPendingChanges();
    reloader.markFolderChanged("agent", "a");
    await reloader.applyPendingChanges();
    expect(published).toEqual([]);
    reloader.close();
  });

  it("keeps the last good definition through an invalid edit and publishes the issue", async () => {
    const { readers, reloader, store, published } = setup();
    readers.agent_team.folders.set("t", { instructions: "v1" });
    await reloader.applyPendingChanges();
    readers.agent_team.folders.set("t", "invalid");
    reloader.markFolderChanged("agent_team", "t");
    await reloader.applyPendingChanges();
    expect(store.getDefinition("agent_team", "t")).not.toBeNull();
    expect(store.getEntry("agent_team", "t")?.issue?.reason).toBe("bad");
    expect(published).toEqual([["agents", "agent_teams", "agent_orgs"]]);
    reloader.close();
  });

  it("isolates a folder read failure: other folders still reconcile and the failed folder is kept", async () => {
    const { readers, reloader, store } = setup();
    readers.agent.folders.set("a", { instructions: "v1" });
    readers.agent.folders.set("b", { instructions: "v1" });
    await reloader.applyPendingChanges();
    readers.agent.folders.set("a", { instructions: "v2" });
    readers.agent.folders.set("b", { instructions: "v2" });
    readers.agent.failOn = "a";
    reloader.markFolderChanged("agent", "a");
    reloader.markFolderChanged("agent", "b");
    await reloader.applyPendingChanges();
    expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(store.getDefinition("agent", "b")?.instructions).toBe("v2");
    reloader.close();
  });

  it("reloadFoldersNow applies and publishes an in-app write immediately", async () => {
    const { readers, reloader, store, published } = setup();
    await reloader.applyPendingChanges();
    readers.agent_org.folders.set("o", { instructions: "v1" });
    await reloader.reloadFoldersNow("agent_org", ["o"]);
    expect(store.getDefinition("agent_org", "o")).not.toBeNull();
    expect(published).toEqual([["agent_orgs"]]);
    reloader.close();
  });

  it("reloadAllPackages reconciles every folder, coalesces concurrent calls and announces every list", async () => {
    const { readers, reloader, store, published } = setup();
    readers.agent.folders.set("a", { instructions: "v1" });
    await reloader.applyPendingChanges();
    readers.agent.folders.delete("a");
    readers.agent.folders.set("b", { instructions: "v1" });
    const listener = vi.fn();
    reloader.setRegistrationListener(listener);
    await Promise.all([reloader.reloadAllPackages(), reloader.reloadAllPackages()]);
    expect(store.getDefinition("agent", "a")).toBeNull();
    expect(store.getDefinition("agent", "b")).not.toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([ROOT]);
    expect(published).toEqual([["agents", "agent_teams", "agent_orgs", "agent_packages"]]);
    reloader.close();
  });

  describe("reconcilePackageFolder (the watcher's catch-up)", () => {
    it("lists a folder nobody marked after the quiet window, and announces only the definition lists", async () => {
      vi.useFakeTimers();
      const { readers, reloader, store, published } = setup({ quietMs: 1000, capMs: 3000 });
      await reloader.applyPendingChanges();
      // The OS dropped this folder's events: the store never heard of it.
      readers.agent_team.folders.set("squad", { instructions: "v1" });
      expect(store.getDefinition("agent_team", "squad")).toBeNull();

      reloader.reconcilePackageFolder(ROOT.rootPath);
      await vi.advanceTimersByTimeAsync(999);
      expect(store.getDefinition("agent_team", "squad")).toBeNull();
      await vi.advanceTimersByTimeAsync(1);
      await reloader.applyPendingChanges();
      expect(store.getDefinition("agent_team", "squad")).not.toBeNull();
      expect(published).toEqual([["agents", "agent_teams", "agent_orgs"]]);
      reloader.close();
    });

    it("announces nothing and re-reads each folder once for an unchanged package, however often it is asked", async () => {
      vi.useFakeTimers();
      const { readers, reloader, published } = setup({ quietMs: 1000, capMs: 3000 });
      readers.agent.folders.set("a", { instructions: "v1" });
      readers.agent_team.folders.set("t", { instructions: "v1" });
      await reloader.applyPendingChanges();
      readers.agent.reads = 0;
      readers.agent_team.reads = 0;

      reloader.reconcilePackageFolder(ROOT.rootPath);
      reloader.reconcilePackageFolder(ROOT.rootPath);
      await vi.advanceTimersByTimeAsync(500);
      reloader.reconcilePackageFolder(ROOT.rootPath);
      await vi.advanceTimersByTimeAsync(1000);
      await reloader.applyPendingChanges();
      expect(readers.agent.reads).toBe(1);
      expect(readers.agent_team.reads).toBe(1);
      expect(published).toEqual([]);
      reloader.close();
    });

    it("is applied by the next read before it answers", async () => {
      const { readers, reloader, store } = setup();
      await reloader.applyPendingChanges();
      readers.agent.folders.set("late", { instructions: "v1" });
      reloader.reconcilePackageFolder(ROOT.rootPath);
      await reloader.applyPendingChanges();
      expect(store.getDefinition("agent", "late")).not.toBeNull();
      reloader.close();
    });

    it("keeps the last loaded definitions of a package folder that is missing and does not announce the package", async () => {
      vi.useFakeTimers();
      let present = true;
      const { readers, reloader, store, published } = setup({ quietMs: 1000, capMs: 3000, rootPresent: () => present });
      readers.agent.folders.set("a", { instructions: "v1" });
      await reloader.applyPendingChanges();
      present = false;
      reloader.reconcilePackageFolder(ROOT.rootPath);
      await vi.advanceTimersByTimeAsync(1000);
      await reloader.applyPendingChanges();
      expect(store.getDefinition("agent", "a")?.instructions).toBe("v1");
      expect(published.flat()).not.toContain("agent_packages");
      reloader.close();
    });

    it("is ignored once the reloader is closed", async () => {
      vi.useFakeTimers();
      const { readers, reloader, store } = setup({ quietMs: 1000, capMs: 3000 });
      await reloader.applyPendingChanges();
      readers.agent.folders.set("a", { instructions: "v1" });
      reloader.close();
      reloader.reconcilePackageFolder(ROOT.rootPath);
      await vi.advanceTimersByTimeAsync(5000);
      expect(store.getDefinition("agent", "a")).toBeNull();
    });
  });

  it("keeps the folders of a registered root whose folder is missing, and recovers when it returns", async () => {
    let present = true;
    const { readers, reloader, store, published } = setup({ rootPresent: () => present });
    readers.agent.folders.set("a", { instructions: "v1" });
    await reloader.applyPendingChanges();
    present = false;
    reloader.markPackageFolderChanged(ROOT.rootPath);
    await reloader.applyPendingChanges();
    expect(store.getDefinition("agent", "a")).not.toBeNull();
    expect(store.getEntry("agent", "a")?.issue?.code).toBe("DEFINITION_SOURCE_UNAVAILABLE");
    expect(published.at(-1)).toEqual(["agents", "agent_teams", "agent_orgs", "agent_packages"]);
    present = true;
    reloader.markPackageFolderChanged(ROOT.rootPath);
    await reloader.applyPendingChanges();
    expect(store.getEntry("agent", "a")?.issue).toBeNull();
    reloader.close();
  });
});
