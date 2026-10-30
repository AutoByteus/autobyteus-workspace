import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORK_JOURNAL_RENDERER_REVISION } from "../../../src/agent-work-journal/domain/work-journal-models.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { WorkJournalService, getWorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import { WorkJournalStore } from "../../../src/agent-work-journal/store/work-journal-store.js";
import { WorkJournalFileRenderer } from "../../../src/agent-work-journal/rendering/work-journal-file-renderer.js";
import {
  appendActive,
  makeRunDir,
  makeTempMemoryRoot,
  rotateActive,
  setSegmentRecordCount,
  turnRecords,
  writeActive,
} from "../raw-trace-folder-fixtures.js";

const read = (filePath: string): string => fs.readFileSync(filePath, "utf-8");
const journalDir = (runDir: string): string => path.join(runDir, "work_journal");
const manifest = (runDir: string) => JSON.parse(read(path.join(journalDir(runDir), "work_journal_manifest.json")));

describe("WorkJournalService.ensureCurrent (DS-004)", () => {
  let root: string;
  let runDir: string;
  const target = () => ({ runId: "run_journal_1", memoryDir: runDir, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });

  beforeEach(() => {
    root = makeTempMemoryRoot();
    runDir = makeRunDir(root);
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("a run that never compacted has one open journal file and an exact manifest (AC-W5)", async () => {
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    const pkg = await new WorkJournalService().ensureCurrent(target());

    expect(fs.readdirSync(journalDir(runDir)).sort()).toEqual(["work_journal_active.md", "work_journal_manifest.json"]);
    expect(pkg).toEqual({
      rootPath: journalDir(runDir),
      manifestPath: path.join(journalDir(runDir), "work_journal_manifest.json"),
      files: [{ path: path.join(journalDir(runDir), "work_journal_active.md"), sourceFile: "raw_traces_active.jsonl", state: "open" }],
      evidenceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(manifest(runDir)).toEqual({
      run_id: "run_journal_1",
      runtime_kind: "claude_agent_sdk",
      renderer_revision: WORK_JOURNAL_RENDERER_REVISION,
      files: [{
        journal_file: "work_journal_active.md",
        source_file: "raw_traces_active.jsonl",
        source_record_count: 4,
        state: "open",
        content_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      }],
    });
    expect(read(pkg.files[0]!.path)).toContain("Command: ls → ok");
  });

  it("after a turn ends the open file includes it; after a compaction the closed file is written once (AC-W5, AC-W6)", async () => {
    const service = new WorkJournalService();
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    const first = await service.ensureCurrent(target());
    appendActive(runDir, turnRecords("turn_2", "pwd", "/w"));
    const second = await service.ensureCurrent(target());
    expect(read(second.files[0]!.path)).toContain("Command: pwd → ok");
    expect(second.evidenceHash).not.toBe(first.evidenceHash);

    rotateActive(runDir);
    appendActive(runDir, turnRecords("turn_3", "git log", "abc"));
    const third = await service.ensureCurrent(target());
    expect(third.files.map((file) => [path.basename(file.path), file.sourceFile, file.state])).toEqual([
      ["work_journal_000001.md", "raw_traces_000001.jsonl", "closed"],
      ["work_journal_active.md", "raw_traces_active.jsonl", "open"],
    ]);
    const closedPath = third.files[0]!.path;
    const closedText = read(closedPath);
    expect(closedText).toContain("file 000001 (closed)");
    expect(closedText).toContain("Command: pwd → ok");
    expect(read(third.files[1]!.path)).not.toContain("Command: pwd");

    const writes = vi.spyOn(WorkJournalStore.prototype, "writeJournalFile");
    const before = fs.statSync(closedPath).mtimeMs;
    appendActive(runDir, turnRecords("turn_4", "date", "today"));
    await service.ensureCurrent(target());
    expect(writes.mock.calls.map((call) => call[1])).toEqual(["work_journal_active.md"]);
    expect(fs.statSync(closedPath).mtimeMs).toBe(before);
    expect(read(closedPath)).toBe(closedText);
    writes.mockRestore();
  });

  it("a closed file regenerated from the same raw traces is byte-identical; nothing is rewritten when nothing changed", async () => {
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    rotateActive(runDir);
    writeActive(runDir, turnRecords("turn_2", "pwd", "/w"));
    const pkg = await new WorkJournalService().ensureCurrent(target());
    const closed = read(pkg.files[0]!.path);
    const hash = pkg.evidenceHash;

    const writes = vi.spyOn(WorkJournalStore.prototype, "writeJournalFile");
    const again = await new WorkJournalService().ensureCurrent(target());
    expect(writes).not.toHaveBeenCalled();
    expect(again.evidenceHash).toBe(hash);
    writes.mockRestore();

    fs.rmSync(journalDir(runDir), { recursive: true });
    const rebuilt = await new WorkJournalService().ensureCurrent(target());
    expect(read(rebuilt.files[0]!.path)).toBe(closed);
    expect(rebuilt.evidenceHash).toBe(hash);
  });

  it("a closed file is rendered again when the renderer revision, runtime or raw record count changes, or it is missing (N4)", async () => {
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    rotateActive(runDir);
    const service = new WorkJournalService();
    await service.ensureCurrent(target());
    const renders = vi.spyOn(WorkJournalFileRenderer.prototype, "render");
    const closedRenders = () => renders.mock.calls.filter((call) => call[0].source.fileName === "raw_traces_000001.jsonl").length;

    const manifestPath = path.join(journalDir(runDir), "work_journal_manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest(runDir), renderer_revision: 0 }));
    await service.ensureCurrent(target());
    expect(closedRenders()).toBe(1);

    const codex = await service.ensureCurrent({ ...target(), runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    expect(closedRenders()).toBe(2);
    expect(read(codex.files[0]!.path)).toContain("Runtime Codex App Server ·");

    setSegmentRecordCount(runDir, "raw_traces_000001.jsonl", 3);
    await service.ensureCurrent({ ...target(), runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    expect(closedRenders()).toBe(3);
    expect(manifest(runDir).files[0].source_record_count).toBe(3);

    fs.rmSync(path.join(journalDir(runDir), "work_journal_000001.md"));
    await service.ensureCurrent({ ...target(), runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    expect(closedRenders()).toBe(4);
    await service.ensureCurrent({ ...target(), runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    expect(closedRenders()).toBe(4);
    renders.mockRestore();
  });

  it("an unreadable manifest is treated as absent; old runs get their journal the first time it is needed", async () => {
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    rotateActive(runDir);
    writeActive(runDir, turnRecords("turn_2", "pwd", "/w"));
    fs.mkdirSync(journalDir(runDir));
    fs.writeFileSync(path.join(journalDir(runDir), "work_journal_manifest.json"), "{not json");
    const pkg = await new WorkJournalService().ensureCurrent(target());
    expect(pkg.files.map((file) => file.state)).toEqual(["closed", "open"]);
    expect(manifest(runDir).files).toHaveLength(2);
  });

  it("a stale open file is removed when the raw folder has no active file; a run without raw traces has an empty package", async () => {
    const empty = await new WorkJournalService().ensureCurrent(target());
    expect(empty.files).toEqual([]);
    expect(manifest(runDir).files).toEqual([]);

    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    await new WorkJournalService().ensureCurrent(target());
    fs.rmSync(path.join(runDir, "raw_traces_active.jsonl"));
    await new WorkJournalService().ensureCurrent(target());
    expect(fs.readdirSync(journalDir(runDir))).toEqual(["work_journal_manifest.json"]);
  });

  it("concurrent callers for one run are serialized; the evidence hash does not read closed files again (N3)", async () => {
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    rotateActive(runDir);
    writeActive(runDir, turnRecords("turn_2", "pwd", "/w"));
    const service = new WorkJournalService();
    await service.ensureCurrent(target());

    let active = 0;
    let maxActive = 0;
    const original = WorkJournalFileRenderer.prototype.render;
    const render = vi.spyOn(WorkJournalFileRenderer.prototype, "render").mockImplementation(function (this: WorkJournalFileRenderer, input) {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const result = original.call(this, input);
      active -= 1;
      return result;
    });
    const readFile = vi.spyOn(fs.promises, "readFile");
    const results = await Promise.all([1, 2, 3].map(() => service.ensureCurrent(target())));
    expect(new Set(results.map((pkg) => pkg.evidenceHash)).size).toBe(1);
    expect(maxActive).toBe(1);
    expect(render.mock.calls.map((call) => call[0].source.fileName)).toEqual(Array(3).fill("raw_traces_active.jsonl"));
    expect(readFile.mock.calls.map((call) => path.basename(String(call[0])))).toEqual(Array(3).fill("work_journal_manifest.json"));
    readFile.mockRestore();
    render.mockRestore();
  });

  it("a failed write reaches the caller and leaves the raw traces untouched; the next call recovers (AC-W6)", async () => {
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    const rawBefore = read(path.join(runDir, "raw_traces_active.jsonl"));
    const service = new WorkJournalService();
    const failing = vi.spyOn(WorkJournalStore.prototype, "writeJournalFile").mockRejectedValueOnce(new Error("disk full"));
    await expect(service.ensureCurrent(target())).rejects.toThrow("disk full");
    failing.mockRestore();
    expect(read(path.join(runDir, "raw_traces_active.jsonl"))).toBe(rawBefore);
    expect(fs.readdirSync(runDir).sort()).toEqual(["raw_traces_active.jsonl"]);
    const pkg = await service.ensureCurrent(target());
    expect(pkg.files).toHaveLength(1);
    expect(fs.readdirSync(journalDir(runDir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("works with no model configured and no runtime available (AC-W7): getWorkJournalService is one instance", async () => {
    writeActive(runDir, turnRecords("turn_1", "ls", "a.ts"));
    expect(getWorkJournalService()).toBe(getWorkJournalService());
    const pkg = await getWorkJournalService().ensureCurrent({ ...target(), runtimeKind: RuntimeKind.GROK_BUILD });
    expect(read(pkg.files[0]!.path)).toContain("Runtime Grok Build");
  });
});
