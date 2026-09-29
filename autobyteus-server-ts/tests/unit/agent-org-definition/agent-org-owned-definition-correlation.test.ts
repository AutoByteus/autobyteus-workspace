import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { correlateAgentOrgOwnedMembers } from "../../../src/agent-org-definition/providers/agent-org-owned-definition-correlation.js";
import {
  findAgentOrgOwnedDefinitionSource,
  listAgentOrgOwnedDefinitionSources,
  listAgentOrgOwnedDefinitionSourcesSync,
} from "../../../src/agent-org-definition/providers/agent-org-owned-definition-source-index.js";
import { buildAgentOrgOwnedDefinitionId } from "../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";
import { writeAgentOrg } from "../../fixtures/agent-org-skill-package.js";

const agentId = (org: string, local: string) => buildAgentOrgOwnedDefinitionId("agent", org, local);
const teamId = (org: string, local: string) => buildAgentOrgOwnedDefinitionId("agent_team", org, local);
const member = (ref: string, refType: "agent" | "agent_team", refScope = "org_local") =>
  ({ memberName: "m", ref, refType, refScope }) as const;
const config = (members: ReturnType<typeof member>[]) =>
  ({ members, handoffs: [], avatarUrl: null, defaultLaunchConfig: null }) as never;

describe("correlateAgentOrgOwnedMembers (AR-014)", () => {
  it("correlates org_local members of the subject with exactly one local folder, in config order, and builds the paths", () => {
    const sources = correlateAgentOrgOwnedMembers({
      subject: "agent", orgRoot: "/root/agent-orgs", orgDirName: "org", orgDefinitionName: "Org",
      config: config([member(agentId("org", "b"), "agent"), member(teamId("org", "t"), "agent_team"),
        member("shared-agent", "agent", "shared"), member(agentId("org", "a"), "agent")]),
      localDirNames: ["a", "b", "unreferenced"],
    });

    expect(sources.map((source) => source.localDefinitionId)).toEqual(["b", "a"]);
    expect(sources[0]).toEqual({
      kind: "agent_org_owned", subject: "agent", definitionId: agentId("org", "b"), localDefinitionId: "b",
      orgDefinitionId: "org", orgDefinitionName: "Org", orgDir: path.join("/root/agent-orgs", "org"),
      definitionDir: path.join("/root/agent-orgs", "org", "agents", "b"),
      mdPath: path.join("/root/agent-orgs", "org", "agents", "b", "agent.md"),
      configPath: path.join("/root/agent-orgs", "org", "agents", "b", "agent-config.json"),
      rootPath: "/root/agent-orgs",
    });
  });

  it("uses the agent-teams folder and team files for the agent_team subject", () => {
    const [team] = correlateAgentOrgOwnedMembers({
      subject: "agent_team", orgRoot: "/r", orgDirName: "org", orgDefinitionName: "Org",
      config: config([member(teamId("org", "t"), "agent_team")]), localDirNames: ["t"],
    });
    expect(team).toMatchObject({ definitionDir: path.join("/r", "org", "agent-teams", "t"), mdPath: path.join("/r", "org", "agent-teams", "t", "team.md") });
  });

  it("skips only the malformed member when no local folder correlates", () => {
    const sources = correlateAgentOrgOwnedMembers({
      subject: "agent", orgRoot: "/r", orgDirName: "org", orgDefinitionName: "Org",
      config: config([member(agentId("org", "missing"), "agent"), member(agentId("other-org", "a"), "agent"), member(agentId("org", "a"), "agent")]),
      localDirNames: ["a"],
    });
    expect(sources.map((source) => source.definitionId)).toEqual([agentId("org", "a")]);
  });

  it("skips ids already seen and repeated members, without mutating the caller's set", () => {
    const seen = new Set([agentId("org", "a")]);
    const sources = correlateAgentOrgOwnedMembers({
      subject: "agent", orgRoot: "/r", orgDirName: "org", orgDefinitionName: "Org",
      config: config([member(agentId("org", "a"), "agent"), member(agentId("org", "b"), "agent"), member(agentId("org", "b"), "agent")]),
      localDirNames: ["a", "b"], seenDefinitionIds: seen,
    });
    expect(sources.map((source) => source.localDefinitionId)).toEqual(["b"]);
    expect([...seen]).toEqual([agentId("org", "a")]);
  });
});

describe("Agent Org owned-source readers: async and sync parity", () => {
  let base: string;
  beforeEach(() => { base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "org-correlation-"))); });
  afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

  it("return identical sources for both subjects across roots, skipping unreadable, `_`-prefixed and malformed orgs", async () => {
    const rootA = path.join(base, "a", "agent-orgs");
    const rootB = path.join(base, "b", "agent-orgs");
    writeAgentOrg(rootA, "zeta", { agents: ["z1"], teams: ["zt"] });
    writeAgentOrg(rootA, "alpha", { agents: ["a2", "a1"], teams: ["t1"] });
    writeAgentOrg(rootA, "_draft", { agents: ["d"] });
    const broken = writeAgentOrg(rootA, "broken", { agents: ["b"] });
    fs.writeFileSync(path.join(broken, "org-config.json"), "{ not json");
    // The same org id under a second root: its ids are already seen and are skipped.
    writeAgentOrg(rootB, "alpha", { agents: ["a1"] });
    writeAgentOrg(rootB, "beta", { agents: ["b1"], teams: ["bt"] });
    const orgRoots = [rootA, rootB, path.join(base, "missing")];

    for (const subject of ["agent", "agent_team"] as const) {
      const asyncSources = await listAgentOrgOwnedDefinitionSources({ subject, orgRoots });
      const syncSources = listAgentOrgOwnedDefinitionSourcesSync({ subject, orgRoots });
      expect(syncSources).toEqual(asyncSources);
      expect(Object.isFrozen(syncSources)).toBe(true);
    }
    expect(listAgentOrgOwnedDefinitionSourcesSync({ subject: "agent", orgRoots }).map((source) => `${source.rootPath === rootA ? "A" : "B"}:${source.orgDefinitionId}/${source.localDefinitionId}`))
      .toEqual(["A:alpha/a2", "A:alpha/a1", "A:zeta/z1", "B:beta/b1"]);
    expect(listAgentOrgOwnedDefinitionSourcesSync({ subject: "agent_team", orgRoots }).map((source) => source.localDefinitionId))
      .toEqual(["t1", "zt", "bt"]);
    expect(await findAgentOrgOwnedDefinitionSource({ definitionId: agentId("beta", "b1"), subject: "agent", orgRoots }))
      .toMatchObject({ definitionDir: path.join(rootB, "beta", "agents", "b1") });
  });
});
