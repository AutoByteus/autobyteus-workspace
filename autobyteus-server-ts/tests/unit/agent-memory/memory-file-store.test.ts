import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
};

const writeJsonl = (filePath: string, lines: string[]) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
};

describe("MemoryFileStore", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("lists run directories sorted", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-store-"));
    fs.mkdirSync(path.join(tempDir, "agents", "b-agent"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "agents", "a-agent"), { recursive: true });

    const store = new MemoryFileStore(tempDir);
    expect(store.listRunDirs()).toEqual(["a-agent", "b-agent"]);
  });

  it("reads JSON objects and returns null for arrays", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-store-"));
    const filePath = path.join(tempDir, "agents", "agent", "working_context_snapshot.json");
    writeJson(filePath, { ok: true });

    const store = new MemoryFileStore(tempDir);
    expect(store.readJson(filePath)).toEqual({ ok: true });

    writeJson(filePath, ["array"]);
    expect(store.readJson(filePath)).toBeNull();
  });

  it("returns null for missing or invalid JSON", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-store-"));
    const store = new MemoryFileStore(tempDir);

    expect(store.readJson(path.join(tempDir, "missing.json"))).toBeNull();

    const filePath = path.join(tempDir, "bad.json");
    fs.writeFileSync(filePath, "{", "utf-8");
    expect(store.readJson(filePath)).toBeNull();
  });

  it("reads JSONL and skips malformed lines", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-store-"));
    const filePath = path.join(tempDir, "agents", "agent", "raw_traces.jsonl");
    writeJsonl(filePath, [JSON.stringify({ a: 1 }), "{", JSON.stringify({ b: 2 }), ""]);

    const store = new MemoryFileStore(tempDir);
    expect(store.readJsonl(filePath)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("returns empty array for missing JSONL", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-store-"));
    const store = new MemoryFileStore(tempDir);
    expect(store.readJsonl(path.join(tempDir, "missing.jsonl"))).toEqual([]);
  });

  it("can suppress missing-file warnings", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-store-"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = new MemoryFileStore(tempDir, { warnOnMissingFiles: false });

    expect(store.readJson(path.join(tempDir, "missing.json"))).toBeNull();
    expect(store.readJsonl(path.join(tempDir, "missing.jsonl"))).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("supports an explicit leaf run root for team-member directories", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-store-"));
    const memberDir = path.join(tempDir, "member-run-a");
    fs.mkdirSync(memberDir, { recursive: true });
    writeJsonl(path.join(memberDir, "raw_traces.jsonl"), [JSON.stringify({ trace_type: "user" })]);

    const store = new MemoryFileStore(tempDir, { runRootSubdir: "" });
    expect(store.listRunDirs()).toEqual(["member-run-a"]);
    expect(store.readRawTracesActive("member-run-a")).toEqual([{ trace_type: "user" }]);
  });
});
