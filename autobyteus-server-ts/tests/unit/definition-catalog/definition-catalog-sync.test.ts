import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { DefinitionCatalog } from "../../../src/definition-catalog/services/definition-catalog.js";
import {
  DefinitionCatalogSync,
  expandChangedSubjects,
} from "../../../src/definition-catalog/services/definition-catalog-sync.js";
import type {
  DefinitionCatalogChangeSubject,
  DefinitionSourceReader,
  DefinitionSubject,
  RegisteredPackageRoot,
  UnitReadOutcome,
} from "../../../src/definition-catalog/domain/definition-catalog-types.js";

const ROOT: RegisteredPackageRoot = {
  rootPath: "/pkg",
  sourceClass: "external_read_only",
  kindDirs: { agents: "/pkg/agents", "agent-teams": "/pkg/agent-teams", "agent-orgs": "/pkg/agent-orgs" },
};

type FakeUnit = { instructions: string } | "invalid";

class FakeReader<S extends DefinitionSubject> implements DefinitionSourceReader<S> {
  readonly units = new Map<string, FakeUnit>();
  reads = 0;
  failOn: string | null = null;
  constructor(readonly subject: S) {}
  async listUnitIds(): Promise<readonly string[]> { return [...this.units.keys()]; }
  async listApplicationOwnedUnitIds(): Promise<readonly string[]> { return []; }
  async readUnit(unitId: string): Promise<UnitReadOutcome> {
    this.reads += 1;
    if (unitId === this.failOn) throw new Error("EIO");
    const unit = this.units.get(unitId);
    if (!unit) return { kind: "absent" };
    const location = { packageRoot: ROOT.rootPath, unitDir: `/pkg/${unitId}`, sourceClass: "external_read_only" as const, fromRegisteredRoot: true };
    if (unit === "invalid") {
      return { kind: "read", location, children: new Map(), root: { subject: this.subject, outcome: { kind: "invalid", code: "DEFINITION_CONTRACT_INVALID", reason: "bad", definitionPath: "/p" } } as never };
    }
    return {
      kind: "read", location, children: new Map(),
      root: {
        subject: this.subject,
        outcome: { kind: "valid", definition: new AgentDefinition({ id: unitId, name: unitId, description: "", instructions: unit.instructions }), fingerprint: unit.instructions },
      } as never,
    };
  }
}

const setup = (options: { quietMs?: number; capMs?: number; rootPresent?: () => boolean } = {}) => {
  const catalog = new DefinitionCatalog();
  const readers = {
    agent: new FakeReader("agent"),
    agent_team: new FakeReader("agent_team"),
    agent_org: new FakeReader("agent_org"),
  };
  const published: DefinitionCatalogChangeSubject[][] = [];
  const sync = new DefinitionCatalogSync({
    catalog,
    readers,
    listPackageRoots: () => [ROOT],
    settleQuietMs: options.quietMs ?? 60_000,
    settleCapMs: options.capMs ?? 120_000,
    isRootPresent: async () => options.rootPresent?.() ?? true,
    logger: { warn: () => undefined },
  });
  sync.setPublisher((subjects) => published.push([...subjects]));
  return { catalog, readers, sync, published };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("expandChangedSubjects", () => {
  it("adds the dependent subjects of each change", () => {
    expect(expandChangedSubjects(["agent"], false)).toEqual(["agent", "agent_team", "agent_org"]);
    expect(expandChangedSubjects(["agent_team"], false)).toEqual(["agent", "agent_team", "agent_org"]);
    expect(expandChangedSubjects(["agent_org"], false)).toEqual(["agent_org"]);
    expect(expandChangedSubjects([], true)).toEqual(["agent_package"]);
  });
});

describe("DefinitionCatalogSync", () => {
  it("populates once on the first read, shared by concurrent reads, without publishing", async () => {
    const { readers, sync, catalog, published } = setup();
    readers.agent.units.set("a", { instructions: "v1" });
    await Promise.all([sync.settle(), sync.settle(), sync.settle()]);
    expect(readers.agent.reads).toBe(1);
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(published).toEqual([]);
    sync.close();
  });

  it("applies a pending change before a read answers, inside the settle window (REQ-018)", async () => {
    const { readers, sync, catalog, published } = setup();
    await sync.settle();
    readers.agent.units.set("new", { instructions: "v1" });
    sync.noteUnitChange("agent", "new");
    await sync.settle();
    expect(catalog.getDefinition("agent", "new")).not.toBeNull();
    expect(published).toEqual([["agent", "agent_team", "agent_org"]]);
    sync.close();
  });

  it("re-reads a unit a read applied mid-write once after the quiet window, even without a further event", async () => {
    vi.useFakeTimers();
    const { readers, sync, catalog } = setup({ quietMs: 1000, capMs: 3000 });
    await sync.settle();
    readers.agent.units.set("a", { instructions: "v1" });
    await sync.reconcileNow("agent", ["a"]);
    // The file is caught half-written by a read; its completing write is not reported again.
    readers.agent.units.set("a", "invalid");
    sync.noteUnitChange("agent", "a");
    await sync.settle();
    expect(catalog.getEntry("agent", "a")?.issue).not.toBeNull();
    readers.agent.units.set("a", { instructions: "v2" });
    await sync.settle();
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
    await vi.advanceTimersByTimeAsync(1000);
    await sync.settle();
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v2");
    expect(catalog.getEntry("agent", "a")?.issue).toBeNull();
    sync.close();
  });

  it("coalesces a burst into one reconcile and one publication after the quiet window", async () => {
    vi.useFakeTimers();
    const { readers, sync, catalog, published } = setup({ quietMs: 1000, capMs: 3000 });
    await sync.settle();
    for (let index = 0; index < 50; index += 1) {
      readers.agent.units.set(`a${index}`, { instructions: "v1" });
      sync.noteUnitChange("agent", `a${index}`);
      sync.noteUnitChange("agent", `a${index}`);
      await vi.advanceTimersByTimeAsync(10);
    }
    expect(published).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    await sync.settle();
    expect(published).toHaveLength(1);
    expect(catalog.listUnitRoots("agent")).toHaveLength(50);
    sync.close();
  });

  it("caps the settle window for a continuous burst", async () => {
    vi.useFakeTimers();
    const { readers, sync, published } = setup({ quietMs: 1000, capMs: 3000 });
    await sync.settle();
    for (let index = 0; index < 40; index += 1) {
      readers.agent.units.set(`a${index}`, { instructions: "v1" });
      sync.noteUnitChange("agent", `a${index}`);
      await vi.advanceTimersByTimeAsync(100);
    }
    await sync.settle();
    expect(published.length).toBeGreaterThanOrEqual(1);
    expect(published.length).toBeLessThanOrEqual(2);
    sync.close();
  });

  it("does not publish when a reconcile changes nothing (in-app write echoes)", async () => {
    const { readers, sync, published } = setup();
    readers.agent.units.set("a", { instructions: "v1" });
    await sync.settle();
    sync.noteUnitChange("agent", "a");
    await sync.settle();
    expect(published).toEqual([]);
    sync.close();
  });

  it("keeps the last good definition through an invalid edit and publishes the issue", async () => {
    const { readers, sync, catalog, published } = setup();
    readers.agent_team.units.set("t", { instructions: "v1" });
    await sync.settle();
    readers.agent_team.units.set("t", "invalid");
    sync.noteUnitChange("agent_team", "t");
    await sync.settle();
    expect(catalog.getDefinition("agent_team", "t")).not.toBeNull();
    expect(catalog.getEntry("agent_team", "t")?.issue?.reason).toBe("bad");
    expect(published).toEqual([["agent", "agent_team", "agent_org"]]);
    sync.close();
  });

  it("isolates a unit read failure: other units still reconcile and the failed unit is kept", async () => {
    const { readers, sync, catalog } = setup();
    readers.agent.units.set("a", { instructions: "v1" });
    readers.agent.units.set("b", { instructions: "v1" });
    await sync.settle();
    readers.agent.units.set("a", { instructions: "v2" });
    readers.agent.units.set("b", { instructions: "v2" });
    readers.agent.failOn = "a";
    sync.noteUnitChange("agent", "a");
    sync.noteUnitChange("agent", "b");
    await sync.settle();
    expect(catalog.getDefinition("agent", "a")?.instructions).toBe("v1");
    expect(catalog.getDefinition("agent", "b")?.instructions).toBe("v2");
    sync.close();
  });

  it("reconcileNow applies and publishes an in-app write immediately", async () => {
    const { readers, sync, catalog, published } = setup();
    await sync.settle();
    readers.agent_org.units.set("o", { instructions: "v1" });
    await sync.reconcileNow("agent_org", ["o"]);
    expect(catalog.getDefinition("agent_org", "o")).not.toBeNull();
    expect(published).toEqual([["agent_org"]]);
    sync.close();
  });

  it("reloadAll reconciles every unit, coalesces concurrent calls and publishes every subject", async () => {
    const { readers, sync, catalog, published } = setup();
    readers.agent.units.set("a", { instructions: "v1" });
    await sync.settle();
    readers.agent.units.delete("a");
    readers.agent.units.set("b", { instructions: "v1" });
    const listener = vi.fn();
    sync.setRegistrationListener(listener);
    await Promise.all([sync.reloadAll(), sync.reloadAll()]);
    expect(catalog.getDefinition("agent", "a")).toBeNull();
    expect(catalog.getDefinition("agent", "b")).not.toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([ROOT]);
    expect(published).toEqual([["agent", "agent_team", "agent_org", "agent_package"]]);
    sync.close();
  });

  it("keeps the units of a registered root whose folder is missing, and recovers when it returns", async () => {
    let present = true;
    const { readers, sync, catalog, published } = setup({ rootPresent: () => present });
    readers.agent.units.set("a", { instructions: "v1" });
    await sync.settle();
    present = false;
    sync.noteRootChanged(ROOT.rootPath);
    await sync.settle();
    expect(catalog.getDefinition("agent", "a")).not.toBeNull();
    expect(catalog.getEntry("agent", "a")?.issue?.code).toBe("DEFINITION_SOURCE_MISSING");
    expect(published.at(-1)).toEqual(["agent", "agent_team", "agent_org", "agent_package"]);
    present = true;
    sync.noteRootChanged(ROOT.rootPath);
    await sync.settle();
    expect(catalog.getEntry("agent", "a")?.issue).toBeNull();
    sync.close();
  });
});
