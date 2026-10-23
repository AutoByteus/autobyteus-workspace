import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrgMigrationFixture, putOrgFixture, writeNestedRoot } from "../../helpers/org-family-migration-fixtures.js";

const fixtures: Awaited<ReturnType<typeof createOrgMigrationFixture>>[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const e of fixtures.splice(0)) await e.close();
});

describe("candidate-contained exact current-Org reference", () => {
  it("validates only the referenced owner metadata/bytes and never enumerates its history", async () => {
    const e = await createOrgMigrationFixture(); fixtures.push(e);
    const owner = await writeNestedRoot(e.memory, "owner");
    expect((await e.migrate()).status).toBe("SUCCEEDED");
    const attachment = path.join(owner.target, "owner-team", "owner-lead", "context_files", "ctx_known__image.png");
    const bytes = Buffer.from([0, 255, 17, 4]);
    await fs.mkdir(path.dirname(attachment), { recursive: true }); await fs.writeFile(attachment, bytes);
    // Deliberately invalid unrelated history is not needed to validate this exact attachment.
    await putOrgFixture(path.join(owner.target, "owner-direct", "raw_traces_active.jsonl"), "do not parse unrelated history", true);
    const source = await writeNestedRoot(e.memory, "source");
    const uri = "/rest/agent-org-runs/owner/agent-runs/owner-lead/context-files/ctx_known__image.png";
    const trace = JSON.stringify({ id: "referencing-user", trace_type: "user", turn_id: "retained-turn", seq: 1, ts: 123,
      content: "Known owner attachment", media: { images: [uri] } }) + "\n";
    await putOrgFixture(path.join(source.source, "source-direct", "raw_traces_active.jsonl"), trace, true);
    const read = vi.spyOn(fs, "readFile"), enumerate = vi.spyOn(fs, "readdir"), write = vi.spyOn(fs, "writeFile");
    const result = await e.migrate();
    expect(result.status, JSON.stringify(result)).toBe("SUCCEEDED");
    const ownerReads = read.mock.calls.map(([file]) => String(file)).filter((file) => file.startsWith(owner.target + path.sep));
    expect(ownerReads.length).toBeGreaterThan(0);
    expect(ownerReads.every((file) => file === path.join(owner.target, "agent_org_run_execution_tree.json"))).toBe(true);
    expect(enumerate.mock.calls.some(([file]) => String(file).startsWith(owner.target))).toBe(false);
    expect(write.mock.calls.some(([file]) => String(file).startsWith(owner.target))).toBe(false);
    vi.restoreAllMocks();
    expect(await fs.readFile(attachment)).toEqual(bytes);
    expect(await fs.readFile(path.join(source.target, "source-direct", "raw_traces_active.jsonl"), "utf8")).toBe(trace);
  });
});
