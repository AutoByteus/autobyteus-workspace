import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateAgentOrgContainerPayload } from "../../../../src/run-history/store/agent-org-container-file-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { isAgentOrgContainerPayload } from "../../../../src/agent-org-execution/domain/agent-org-container-file.js";

/** org-container-storage-contract.md §2–§4: the contract's examples read back exactly by the current readers. */
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../fixtures/org-container-contract", name), "utf8"));
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true }))); });

describe("Org container storage contract §2: the container file", () => {
  it("reads the contract example back exactly; it is a container, a released Org tree v1 is not", () => {
    const file = fixture("container-file.json");
    expect(validateAgentOrgContainerPayload(file, "sdd_org_1")).toEqual(file);
    expect(isAgentOrgContainerPayload(file)).toBe(true);
    expect(isAgentOrgContainerPayload({ rootOrg: { members: [] } })).toBe(false);
  });

  it("refuses an Org rule from outside every unit, a duplicate unit address or run, and a unit below the Org's top level", () => {
    const file = fixture("container-file.json");
    expect(() => validateAgentOrgContainerPayload({ ...file, handoffs: [{ from: "/nobody", to: "/concierge", rules: ["x"] }] }))
      .toThrow("Org rule sender '/nobody' is not in a unit of the Org.");
    const units = file.rootOrg.units;
    expect(() => validateAgentOrgContainerPayload({ ...file, rootOrg: { ...file.rootOrg, units: [...units, { ...units[0], runId: "other" }] } }))
      .toThrow("Duplicate Org unit address '/software_engineering_team'.");
    expect(() => validateAgentOrgContainerPayload({ ...file, rootOrg: { ...file.rootOrg, formerUnits: [{ ...units[2], address: "/old" }] } }))
      .toThrow("Duplicate Org unit run 'concierge_1'.");
    expect(() => validateAgentOrgContainerPayload({ ...file, rootOrg: { ...file.rootOrg, units: [{ ...units[2], address: "/a/b" }] }, handoffs: [] }))
      .toThrow("is not a direct Org address");
    expect(() => validateAgentOrgContainerPayload({ ...file, rootOrg: { ...file.rootOrg, units: undefined, members: [] } }))
      .toThrow("rootOrg.units");
  });
});

describe("Org container storage contract §3: a Team unit's tree", () => {
  it("reads the contract example back exactly, keeping containedIn; in team space", () => {
    const tree = fixture("team-unit-tree.json");
    expect(validateTeamRunExecutionTreePayload(tree, "set_team_1")).toEqual(tree);
  });

  it("refuses a Team unit that also carries delegatedFrom or copiedFrom, and a malformed containedIn", () => {
    const tree = fixture("team-unit-tree.json");
    expect(() => validateTeamRunExecutionTreePayload({ ...tree, copiedFrom: "team_definition" })).toThrow("not a delegated run");
    expect(() => validateTeamRunExecutionTreePayload({ ...tree, delegatedFrom: { delegatingRun: { kind: "agent", runId: "x" } } })).toThrow("not a delegated run");
    expect(() => validateTeamRunExecutionTreePayload({ ...tree, containedIn: { orgRunId: "sdd_org_1" } })).toThrow("containedIn");
  });
});

describe("Org container storage contract §4: an agent unit's run_metadata.json", () => {
  const write = async (metadata: Record<string, unknown>) => {
    const memoryDir = await fsp.mkdtemp(path.join(os.tmpdir(), "org-unit-metadata-"));
    dirs.push(memoryDir);
    const runDir = path.join(memoryDir, "agents", "concierge_1");
    await fsp.mkdir(runDir, { recursive: true });
    await fsp.writeFile(path.join(runDir, "run_metadata.json"), JSON.stringify({ ...metadata, memoryDir: runDir }));
    return new AgentRunMetadataStore(memoryDir);
  };

  it("reads containedIn and address", async () => {
    const store = await write(fixture("agent-unit-metadata.json"));
    expect(await store.readMetadataState("concierge_1")).toMatchObject({ kind: "present",
      metadata: { containedIn: { orgRunId: "sdd_org_1", address: "/concierge" }, address: "/concierge" } });
  });

  it("refuses a containedIn whose address is not the run's address, and a contained run that is also delegated", async () => {
    const mismatch = await write({ ...fixture("agent-unit-metadata.json"), address: "/elsewhere" });
    expect(await mismatch.readMetadataState("concierge_1")).toMatchObject({ kind: "unreadable" });
    const delegated = await write({ ...fixture("agent-unit-metadata.json"), delegatedFrom: { delegatingRun: { kind: "agent", runId: "x" } } });
    expect(await delegated.readMetadataState("concierge_1")).toMatchObject({ kind: "unreadable" });
  });
});
