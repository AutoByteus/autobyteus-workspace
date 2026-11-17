import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { EpisodicCatalogStore } from "../../../src/agent-episodic-catalog/store/episodic-catalog-store.js";

describe("EpisodicCatalogStore", () => {
  let memoryDir: string;
  let store: EpisodicCatalogStore;
  beforeEach(() => {
    memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "episodic-store-"));
    store = new EpisodicCatalogStore(new AgentMemoryLayout(memoryDir));
  });
  afterEach(() => fs.rmSync(memoryDir, { recursive: true, force: true }));

  it("writes a whole file only when its content changed, leaving no temporary file", async () => {
    const id = "team-local-agent:t:writer";
    const file = path.join(memoryDir, "episodic", "team-local-agent%3At%3Awriter", "catalog.md");
    expect(await store.writeCatalog(id, "one\n")).toBe(true);
    expect(fs.readFileSync(file, "utf-8")).toBe("one\n");
    const writtenAt = fs.statSync(file).mtimeMs;
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(await store.writeCatalog(id, "one\n")).toBe(false);
    expect(fs.statSync(file).mtimeMs).toBe(writtenAt);
    // A hand edit differs from the rendered text, so the next write replaces it.
    fs.writeFileSync(file, "edited by hand\n");
    expect(await store.writeCatalog(id, "one\n")).toBe(true);
    expect(fs.readFileSync(file, "utf-8")).toBe("one\n");
    expect(await store.writeIndex("index\n")).toBe(true);
    expect(fs.readdirSync(path.join(memoryDir, "episodic")).sort()).toEqual(["index.md", "team-local-agent%3At%3Awriter"]);
    expect(fs.readdirSync(path.dirname(file))).toEqual(["catalog.md"]);
  });

  it("lists the definitions of existing catalog folders, decoded; other folders and files are not catalogs", async () => {
    expect(await store.listCatalogDefinitionIds()).toEqual([]);
    for (const name of ["project-task-manager", "team-local-agent%3At%3Awriter", "not encoded:", "bad%E0%A4%A"]) {
      fs.mkdirSync(path.join(memoryDir, "episodic", name), { recursive: true });
    }
    fs.writeFileSync(path.join(memoryDir, "episodic", "index.md"), "x");
    expect(await store.listCatalogDefinitionIds()).toEqual(["project-task-manager", "team-local-agent:t:writer"]);
    expect(store.folderNameOf("team-local-agent:t:writer")).toBe("team-local-agent%3At%3Awriter");
  });
});
