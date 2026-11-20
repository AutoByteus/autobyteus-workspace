import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCanonicalApplicationOwnedTeamId } from "../../../src/application-bundles/utils/application-bundle-identity.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { AgentSemanticMemory } from "../../../src/agent-memory/services/agent-semantic-memory.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { EPISODIC_CATALOG_FILE_NAME, EpisodicCatalogStore } from "../../../src/agent-episodic-catalog/store/episodic-catalog-store.js";
import { SemanticMemoryWorkspace } from "../../../src/workspaces/semantic-memory-workspace.js";

/**
 * One definition folder name rule (autobyteus-554 SR-009, DEC-016, AC-013): `encodeURIComponent(id)` up to 200 bytes;
 * a longer one is its first 120 bytes (never inside a `%XX`), `#`, and 16 hex characters of the ID's SHA-256. The
 * semantic folder, the episodic catalog folder and the Semantic tab's workspace lookup all use it (CRR-003 CR-002:
 * a bundled team-local run failed with ENAMETOOLONG).
 */
let memoryDir: string;

beforeEach(async () => {
  memoryDir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "definition-folder-names-")), "memory");
});
afterEach(async () => {
  await fs.rm(path.dirname(memoryDir), { recursive: true, force: true });
});

const nameOf = (id: string): string => path.basename(new AgentMemoryLayout(memoryDir).getAgentSemanticMemoryDirPath(id));
const hash16 = (id: string): string => createHash("sha256").update(id).digest("hex").slice(0, 16);

/** An application-bundled team-local agent, as RE-05's Brief Studio researcher: the bundle's path is in hex, twice. */
const bundledTeamLocalId = (localAgentId = "researcher"): string => buildTeamLocalAgentDefinitionId(
  buildCanonicalApplicationOwnedTeamId(
    `application-local:${encodeURIComponent("/Users/someone/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/applications/brief-studio/dist/importable-package")}`,
    "brief-studio",
    "brief-studio-team",
  ),
  localAgentId,
);

describe("definition folder names that fit (unchanged)", () => {
  it.each([
    "computer-use-operator",
    "team-local-agent:marketing-team:marketing-reply-scout",
    "app-agent__6a2f9c__brief-writer",
    "x".repeat(200),
    `${"y".repeat(197)}:`,
  ])("%s keeps exactly encodeURIComponent(id)", (id) => {
    expect(encodeURIComponent(id).length).toBeLessThanOrEqual(200);
    expect(nameOf(id)).toBe(encodeURIComponent(id));
  });
});

describe("definition folder names that do not fit (shortened)", () => {
  it("shortens a bundled team-local ID to a name every file system accepts (RE-05's 439 bytes)", () => {
    const id = bundledTeamLocalId();
    expect(encodeURIComponent(id).length).toBeGreaterThan(255);
    const name = nameOf(id);
    expect(name).toBe(`${encodeURIComponent(id).slice(0, 120)}#${hash16(id)}`);
    expect(Buffer.byteLength(name)).toBe(137);
  });

  it("shortens from 201 bytes on", () => {
    const id = "x".repeat(201);
    expect(nameOf(id)).toBe(`${"x".repeat(120)}#${hash16(id)}`);
  });

  it("gives two long IDs that share the first 120 bytes different names, and never a full name's", () => {
    const researcher = nameOf(bundledTeamLocalId("researcher"));
    const writer = nameOf(bundledTeamLocalId("writer"));
    expect(researcher.slice(0, 120)).toBe(writer.slice(0, 120));
    expect(researcher).not.toBe(writer);
    expect(encodeURIComponent(researcher)).not.toBe(researcher);
  });

  // N-13: the 120-byte cut never falls inside a `%XX` escape, so the kept prefix always decodes.
  it.each([
    [117, 120],
    [118, 118],
    [119, 119],
    [120, 120],
  ])("an escape starting at byte %i keeps a prefix of %i bytes that decodes", (escapeStart, kept) => {
    const id = `${"a".repeat(escapeStart)}:${"b".repeat(200)}`;
    const encoded = encodeURIComponent(id);
    expect(encoded.slice(escapeStart, escapeStart + 3)).toBe("%3A");
    const name = nameOf(id);
    const prefix = name.slice(0, name.indexOf("#"));
    expect(prefix).toBe(encoded.slice(0, kept));
    expect(() => decodeURIComponent(prefix)).not.toThrow();
    expect(name).toBe(`${prefix}#${hash16(id)}`);
  });

  it("keeps whole escapes for an ID of multi-byte characters", () => {
    const id = "研究".repeat(40);
    const name = nameOf(id);
    const prefix = name.slice(0, name.indexOf("#"));
    expect(prefix.length).toBe(117);
    expect(decodeURIComponent(prefix)).toBe("研究".repeat(6) + "研");
  });
});

describe("one name for a long ID everywhere (AC-013)", () => {
  it("prepares the semantic folder, writes the catalog and opens the Semantic tab's workspace under the same name", async () => {
    const id = bundledTeamLocalId();
    const layout = new AgentMemoryLayout(memoryDir);
    const semanticMemory = new AgentSemanticMemory({ memoryDir });

    const folders = await semanticMemory.prepareForRun(id);
    expect(folders.agentFolder).toBe(semanticMemory.folderOf(id));
    expect((await fs.stat(folders.agentFolder!)).isDirectory()).toBe(true);
    expect(path.basename(layout.getAgentEpisodicDirPath(id))).toBe(path.basename(folders.agentFolder!));

    const store = new EpisodicCatalogStore(layout);
    expect(await store.writeCatalog(id, "# Catalog\n")).toBe(true);
    expect(await fs.readFile(path.join(layout.getAgentEpisodicDirPath(id), EPISODIC_CATALOG_FILE_NAME), "utf8")).toBe("# Catalog\n");

    // The workspace ID stays the full encoded ID; only the folder is named by the rule.
    await fs.writeFile(path.join(folders.agentFolder!, "notes.md"), "# Notes\n");
    const workspace = await SemanticMemoryWorkspace.open(`semantic_ws_${encodeURIComponent(id)}`, semanticMemory);
    expect(workspace.getBasePath()).toBe(folders.agentFolder);
    expect(await semanticMemory.folderState(id)).toEqual({ folderPath: folders.agentFolder, exists: true, isEmpty: false });
  });

  it("does not read a shortened catalog folder back as a definition; full names still are", async () => {
    const layout = new AgentMemoryLayout(memoryDir);
    const store = new EpisodicCatalogStore(layout);
    const longId = bundledTeamLocalId();
    for (const id of [longId, "computer-use-operator", "team-local-agent:se:designer"]) await store.writeCatalog(id, "# Catalog\n");
    await fs.mkdir(path.join(layout.getEpisodicRootDirPath(), "%20"));
    expect(await store.listCatalogDefinitionIds()).toEqual(["computer-use-operator", "team-local-agent:se:designer"]);
  });
});
