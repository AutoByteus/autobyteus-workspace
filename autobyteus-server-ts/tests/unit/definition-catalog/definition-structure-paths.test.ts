import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyDefinitionUnit,
  isWatchedDefinitionPath,
} from "../../../src/definition-catalog/monitor/definition-structure-paths.js";
import type { RegisteredPackageRoot } from "../../../src/definition-catalog/domain/definition-catalog-types.js";

const rootPath = path.resolve("/pkg");
const root: RegisteredPackageRoot = {
  rootPath,
  sourceClass: "external_read_only",
  kindDirs: {
    agents: path.join(rootPath, "agents"),
    "agent-teams": path.join(rootPath, "agent-teams"),
    "agent-orgs": path.join(rootPath, "agent-orgs"),
  },
};
const p = (...segments: string[]) => path.join(rootPath, ...segments);

describe("definition structure allow-list", () => {
  it.each([
    [p("agents"), true],
    [p("agents", "a"), true],
    [p("agent-teams", "t", "agents"), true],
    [p("agent-teams", "t", "agents", "a"), true],
    [p("agent-orgs", "o", "agents", "a"), true],
    [p("agent-orgs", "o", "agent-teams", "t"), true],
    [p("agent-orgs", "o", "agent-teams", "t", "agents", "a"), true],
  ])("watches definition folder %s", (target, isDirectory) => {
    expect(isWatchedDefinitionPath(root, target, isDirectory)).toBe(true);
  });

  it.each([
    p("agents", "a", "agent.md"),
    p("agents", "a", "agent-config.json"),
    p("agent-teams", "t", "team.md"),
    p("agent-teams", "t", "team-config.json"),
    p("agent-teams", "t", "agents", "a", "agent.md"),
    p("agent-orgs", "o", "org.md"),
    p("agent-orgs", "o", "org-config.json"),
    p("agent-orgs", "o", "agents", "a", "agent-config.json"),
    p("agent-orgs", "o", "agent-teams", "t", "team-config.json"),
    p("agent-orgs", "o", "agent-teams", "t", "agents", "a", "agent.md"),
  ])("watches definition file %s", (target) => {
    expect(isWatchedDefinitionPath(root, target, false)).toBe(true);
  });

  it.each([
    p("skills"),
    p("docs", "readme.md"),
    p(".git"),
    p("agents", "a", "skills"),
    p("agents", "a", "skills", "s", "SKILL.md"),
    p("agents", "a", "notes.md"),
    p("agents", "_template"),
    p("agents", ".hidden"),
    p("agent-teams", "t", "skills"),
    p("agent-teams", "t", "agents", "a", "skills", "x", "SKILL.md"),
    p("agent-teams", "t", "agents", "_draft"),
    p("agent-teams", "t", "node_modules"),
    p("agent-orgs", "o", "agents", "a", "scripts", "run.sh"),
    p("agent-orgs", "o", "agent-teams", "t", "docs"),
  ])("does not watch %s", (target) => {
    expect(isWatchedDefinitionPath(root, target)).toBe(false);
  });

  it("uses the known path type: a file where a folder belongs is not watched", () => {
    expect(isWatchedDefinitionPath(root, p("agents", "readme.md"), false)).toBe(false);
    expect(isWatchedDefinitionPath(root, p("agents", "a", "agent.md"), true)).toBe(false);
  });

  it("classifies every watched path into its unit", () => {
    expect(classifyDefinitionUnit(root, p("agents", "a", "agent.md"))).toEqual({ subject: "agent", unitId: "a" });
    expect(classifyDefinitionUnit(root, p("agent-teams", "t", "agents", "a", "agent.md"))).toEqual({ subject: "agent_team", unitId: "t" });
    expect(classifyDefinitionUnit(root, p("agent-orgs", "o", "agent-teams", "t", "agents", "a"))).toEqual({ subject: "agent_org", unitId: "o" });
    expect(classifyDefinitionUnit(root, p("agents"))).toBeNull();
    expect(classifyDefinitionUnit(root, p("agents", "a", "skills", "s", "SKILL.md"))).toBeNull();
    expect(classifyDefinitionUnit(root, p("docs"))).toBeNull();
  });
});
