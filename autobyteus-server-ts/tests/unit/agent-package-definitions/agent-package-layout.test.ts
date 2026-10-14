import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findDefinitionFolderForPath,
  isWatchedPackagePath,
} from "../../../src/agent-package-definitions/monitor/agent-package-layout.js";
import type { RegisteredPackageRoot } from "../../../src/agent-package-definitions/domain/agent-package-definition-types.js";

const rootPath = path.resolve("/pkg");
const root: RegisteredPackageRoot = {
  rootPath,
  sourceClass: "registered_package",
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
    expect(isWatchedPackagePath(root, target, isDirectory)).toBe(true);
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
    expect(isWatchedPackagePath(root, target, false)).toBe(true);
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
    expect(isWatchedPackagePath(root, target)).toBe(false);
  });

  it("uses the known path type: a file where a folder belongs is not watched", () => {
    expect(isWatchedPackagePath(root, p("agents", "readme.md"), false)).toBe(false);
    expect(isWatchedPackagePath(root, p("agents", "a", "agent.md"), true)).toBe(false);
  });

  it("classifies every watched path into its folder", () => {
    expect(findDefinitionFolderForPath(root, p("agents", "a", "agent.md"))).toEqual({ kind: "agent", folderId: "a" });
    expect(findDefinitionFolderForPath(root, p("agent-teams", "t", "agents", "a", "agent.md"))).toEqual({ kind: "agent_team", folderId: "t" });
    expect(findDefinitionFolderForPath(root, p("agent-orgs", "o", "agent-teams", "t", "agents", "a"))).toEqual({ kind: "agent_org", folderId: "o" });
    expect(findDefinitionFolderForPath(root, p("agents"))).toBeNull();
    expect(findDefinitionFolderForPath(root, p("agents", "a", "skills", "s", "SKILL.md"))).toBeNull();
    expect(findDefinitionFolderForPath(root, p("docs"))).toBeNull();
  });
});
