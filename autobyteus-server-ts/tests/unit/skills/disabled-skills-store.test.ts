import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DisabledSkillsStore } from "../../../src/skills/disabled-skills-store.js";

describe("DisabledSkillsStore", () => {
  let tempDir: string;
  let storePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-disabled-"));
    storePath = path.join(tempDir, "disabled_skills.json");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("starts empty", () => {
    const store = new DisabledSkillsStore(storePath);
    expect(store.getDisabledSkills()).toEqual([]);
  });

  it("adds disabled skills", () => {
    const store = new DisabledSkillsStore(storePath);
    store.add("canvas-design");
    expect(store.getDisabledSkills()).toContain("canvas-design");
  });

  it("adds multiple skills", () => {
    const store = new DisabledSkillsStore(storePath);
    store.add("skill-a");
    store.add("skill-b");
    store.add("skill-c");

    const disabled = store.getDisabledSkills();
    expect(disabled).toHaveLength(3);
    expect(disabled).toContain("skill-a");
    expect(disabled).toContain("skill-b");
    expect(disabled).toContain("skill-c");
  });

  it("is idempotent on duplicate add", () => {
    const store = new DisabledSkillsStore(storePath);
    store.add("canvas-design");
    store.add("canvas-design");
    const disabled = store.getDisabledSkills();
    expect(disabled.filter((item) => item === "canvas-design")).toHaveLength(1);
  });

  it("removes disabled skills", () => {
    const store = new DisabledSkillsStore(storePath);
    store.add("canvas-design");
    store.remove("canvas-design");
    expect(store.getDisabledSkills()).not.toContain("canvas-design");
  });

  it("removes non-existent skills safely", () => {
    const store = new DisabledSkillsStore(storePath);
    store.remove("nonexistent");
    expect(store.getDisabledSkills()).toEqual([]);
  });

  it("reports disabled status correctly", () => {
    const store = new DisabledSkillsStore(storePath);
    store.add("canvas-design");
    expect(store.isDisabled("canvas-design")).toBe(true);
    expect(store.isDisabled("some-skill")).toBe(false);
  });

  it("persists across instances", () => {
    const store1 = new DisabledSkillsStore(storePath);
    store1.add("skill-a");
    store1.add("skill-b");

    const store2 = new DisabledSkillsStore(storePath);
    const disabled = store2.getDisabledSkills();
    expect(disabled).toContain("skill-a");
    expect(disabled).toContain("skill-b");
  });

  it("handles corrupted file gracefully", () => {
    fs.writeFileSync(storePath, "not valid json {{{");
    const store = new DisabledSkillsStore(storePath);
    expect(store.getDisabledSkills()).toEqual([]);
  });

  it("creates file on first add", () => {
    expect(fs.existsSync(storePath)).toBe(false);
    const store = new DisabledSkillsStore(storePath);
    store.add("canvas-design");
    expect(fs.existsSync(storePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    expect(content).toContain("canvas-design");
  });
});
