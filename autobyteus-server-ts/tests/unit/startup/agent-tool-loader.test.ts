import { describe, expect, it, vi } from "vitest";
import { AgentToolRegistryReadiness } from "../../../src/startup/agent-tool-loader.js";

const specs = [
  ["autobyteus-ts/tools/register-tools.js", "registerTools", "core"],
  ["../agent-tools/browser/register-browser-tools.js", "registerBrowserTools", "browser"],
  ["../agent-tools/task-delegation/register-task-delegation-tools.js", "registerTaskDelegationTools", "task_delegation"],
  ["../agent-tools/agent-communication/register-agent-communication-tools.js", "registerAgentCommunicationTools", "agent_communication"],
  ["../agent-tools/published-artifacts/register-published-artifact-tools.js", "registerPublishedArtifactTools", "published_artifact"],
  ["../agent-tools/media/register-media-tools.js", "registerMediaTools", "media"],
  ["../agent-tools/search/register-search-tool.js", "registerProvisionedSearchTool", "search"],
] as const;

const buildModuleLoader = (input: {
  onRegister?: (key: string, dependency: unknown) => void | Promise<void>;
  missingExportFor?: string;
  loadFailureFor?: string;
} = {}) => {
  const loads: string[] = [];
  const registrations: string[] = [];
  const loader = vi.fn(async (modulePath: string): Promise<Record<string, unknown>> => {
    const spec = specs.find(([path]) => path === modulePath);
    if (!spec) throw new Error(`unexpected module ${modulePath}`);
    const [, exportName, key] = spec;
    loads.push(key);
    if (input.loadFailureFor === key) throw new Error(`${key} module unavailable`);
    if (input.missingExportFor === key) return {};
    return {
      [exportName]: async (dependency: unknown) => {
        registrations.push(key);
        await input.onRegister?.(key, dependency);
      },
    };
  });
  return { loader, loads, registrations };
};

describe("AgentToolRegistryReadiness", () => {
  it("registers Core first, five server units next, and Search last with ordered results", async () => {
    const publisher = { publish: vi.fn() };
    const observations: Array<{ key: string; dependency: unknown }> = [];
    const modules = buildModuleLoader({
      onRegister: (key, dependency) => observations.push({ key, dependency }),
    });

    const results = await new AgentToolRegistryReadiness(
      { publishedArtifactPublicationService: publisher },
      modules.loader,
    ).registerRequiredGroups();

    expect(results.map(({ key }) => key)).toEqual([
      "core",
      "browser",
      "task_delegation",
      "agent_communication",
      "published_artifact",
      "media",
      "search",
    ]);
    expect(results.every(({ status }) => status === "registered")).toBe(true);
    expect(modules.loads[0]).toBe("core");
    expect(modules.registrations[0]).toBe("core");
    expect(modules.loads.at(-1)).toBe("search");
    expect(modules.registrations.at(-1)).toBe("search");
    expect(observations.find(({ key }) => key === "published_artifact")?.dependency)
      .toBe(publisher);
    expect(observations.filter(({ key }) => key !== "published_artifact")
      .every(({ dependency }) => dependency === undefined)).toBe(true);
  });

  it("memoizes concurrent and repeated registration to one sticky result", async () => {
    const modules = buildModuleLoader();
    const readiness = new AgentToolRegistryReadiness({}, modules.loader);

    const first = readiness.registerRequiredGroups();
    const concurrent = readiness.registerRequiredGroups();
    expect(concurrent).toBe(first);
    const result = await first;
    expect(await readiness.registerRequiredGroups()).toBe(result);
    expect(modules.loader).toHaveBeenCalledTimes(7);
  });

  it("names a server registrar failure, never starts Search, and never retries", async () => {
    const modules = buildModuleLoader({
      onRegister: (key) => {
        if (key === "task_delegation") throw new Error("delegation registry unavailable");
      },
    });
    const readiness = new AgentToolRegistryReadiness({}, modules.loader);

    const first = readiness.registerRequiredGroups();
    await expect(first).rejects.toThrow(
      "Required server-owned tool registration failed.",
    );
    await expect(readiness.registerRequiredGroups()).rejects.toBeInstanceOf(AggregateError);
    expect(modules.loads).not.toContain("search");
    expect(modules.loader).toHaveBeenCalledTimes(6);
    const aggregate = await first.catch((error: unknown) => error as AggregateError);
    expect(aggregate.errors.map((error) => String(error))).toEqual(expect.arrayContaining([
      expect.stringContaining("Task Delegation Tools"),
      expect.stringContaining("delegation registry unavailable"),
    ]));
  });

  it("names a missing registrar export and blocks Search", async () => {
    const modules = buildModuleLoader({ missingExportFor: "media" });

    const failure = await new AgentToolRegistryReadiness({}, modules.loader)
      .registerRequiredGroups()
      .catch((error: unknown) => error as AggregateError);

    expect(failure).toBeInstanceOf(AggregateError);
    expect(failure.errors.map((error) => String(error))).toEqual(expect.arrayContaining([
      expect.stringContaining("Media Tools"),
      expect.stringContaining("registerMediaTools"),
    ]));
    expect(modules.loads).not.toContain("search");
  });

  it("names a module-load failure and retains the rejected memoized promise", async () => {
    const modules = buildModuleLoader({ loadFailureFor: "core" });
    const readiness = new AgentToolRegistryReadiness({}, modules.loader);
    const failure = readiness.registerRequiredGroups();

    await expect(failure).rejects.toThrow("Required tool unit 'Core Tools' could not load");
    expect(readiness.registerRequiredGroups()).toBe(failure);
    expect(modules.loader).toHaveBeenCalledOnce();
  });
});
