import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture } from "./fixtures.js";

/** Update-notification support in `SkillSourceService`: the projection and the change listener. */
const fixtures: ReturnType<typeof fixture>[] = [];
const setup = () => { const f = fixture(); fixtures.push(f); return f; };
const url = "https://github.com/acme/skills";
afterEach(() => { vi.restoreAllMocks(); fixtures.splice(0).forEach(f => f.cleanup()); });

describe("GitHub skill source update state", () => {
  it("projects ACTIVE sources with the known latest revision, kept after a failed check", async () => {
    const f = setup();
    await f.service.importGitHubSkillSource(url);
    const [imported] = f.service.listGitHubSourceUpdateStates();
    expect(imported).toMatchObject({
      displayName: "acme/skills", repositoryUrl: "https://github.com/acme/skills", defaultBranch: "main",
      installedRevision: "a".repeat(40), latestRevision: "a".repeat(40),
    });
    f.setRevision("b".repeat(40));
    await f.service.checkGitHubSkillSourceUpdates();
    expect(f.service.listGitHubSourceUpdateStates()[0]!.latestRevision).toBe("b".repeat(40));
    f.setError(new Error("offline"));
    await f.service.checkGitHubSkillSourceUpdates();
    const [afterFailure] = f.service.listGitHubSourceUpdateStates();
    expect(afterFailure!.latestRevision).toBe("b".repeat(40));
    expect(afterFailure!.lastCheckedAt).not.toBe(imported!.lastCheckedAt);
  });

  it("tells the listener after import, check, update (also a failed one) and removal", async () => {
    const f = setup();
    const listener = vi.fn();
    f.service.setGitHubSourceStateListener(listener);
    const { sources } = await f.service.importGitHubSkillSource(url);
    expect(listener).toHaveBeenCalledTimes(1);
    const id = sources.find(source => source.github)!.sourceId;
    await f.service.checkGitHubSkillSourceUpdates([id]);
    expect(listener).toHaveBeenCalledTimes(2);
    f.setError(new Error("offline"));
    await expect(f.service.updateGitHubSkillSource(id)).rejects.toThrow("offline");
    expect(listener).toHaveBeenCalledTimes(3);
    f.setError(null);
    await f.service.removeGitHubSkillSource(id);
    expect(listener).toHaveBeenCalledTimes(4);
    expect(f.service.listGitHubSourceUpdateStates()).toEqual([]);
  });

  it("a throwing listener never fails the action", async () => {
    const f = setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    f.service.setGitHubSourceStateListener(() => { throw new Error("listener broken"); });
    await expect(f.service.importGitHubSkillSource(url)).resolves.toMatchObject({ sources: expect.any(Array) });
  });
});
