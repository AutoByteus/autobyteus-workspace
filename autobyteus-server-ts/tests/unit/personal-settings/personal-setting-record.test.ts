import { describe, expect, it } from "vitest";
import {
  parsePersonalSettingKey,
  personalSettingKey,
  readPersonalSettingRecord,
  settingsOfKind,
  toRecord,
} from "../../../src/personal-settings/domain/personal-setting-record.js";

/** personal-settings-file-contract.md §3–§4; the cases of evidence/validate-personal-settings-file.mjs (V-A, V-B). */
describe("personal setting keys (contract §3.1, V-A)", () => {
  it("builds and splits keys at the first ':' (IDs may contain ':')", () => {
    const id = "team-local-agent:software-engineering-team:solution-designer";
    expect(personalSettingKey("agent", id)).toBe(`agent:${id}`);
    expect(parsePersonalSettingKey(`agent:${id}`)).toEqual({ kind: "agent", definitionId: id });
    expect(parsePersonalSettingKey("agent_org:agent-org-owned-team:o:t")).toEqual({ kind: "agent_org", definitionId: "agent-org-owned-team:o:t" });
  });

  it("refuses an unknown kind, an empty ID and a key without a separator", () => {
    expect(parsePersonalSettingKey("unknown:thing")).toBeNull();
    expect(parsePersonalSettingKey("agent:")).toBeNull();
    expect(parsePersonalSettingKey("agent")).toBeNull();
  });
});

describe("tolerant record reader (contract §4, V-B)", () => {
  const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5", llmConfig: null };

  it("keeps the valid records of the contract's sample", () => {
    expect(readPersonalSettingRecord("agent", { toolsAdded: ["github_create_issue"], avatarUrl: "/rest/files/images/a.png" }))
      .toEqual({ record: { toolsAdded: ["github_create_issue"], avatarUrl: "/rest/files/images/a.png" }, skipped: [] });
    expect(readPersonalSettingRecord("agent_team", { defaultLaunchConfig: launch }))
      .toEqual({ record: { defaultLaunchConfig: launch }, skipped: [] });
  });

  it.each([
    ["a field not allowed on its kind", "agent_team", { toolsAdded: ["x"] }],
    ["an empty list", "agent", { toolsAdded: [] }],
    ["a duplicated list", "agent", { toolsAdded: ["a", "a"] }],
    ["the same name added and removed", "agent", { toolsAdded: ["a"], toolsRemoved: ["a"] }],
    ["an incomplete launch config", "agent", { defaultLaunchConfig: { runtimeKind: "x" } }],
    ["a launch config with an extra key", "agent", { defaultLaunchConfig: { ...launch, extra: 1 } }],
    ["a non-object record", "agent", ["toolsAdded"]],
    ["an empty avatar", "agent_org", { avatarUrl: "" }],
  ] as const)("skips a record with only %s", (_label, kind, raw) => {
    expect(readPersonalSettingRecord(kind, raw).record).toBeNull();
  });

  it("skips only the invalid fields and both lists of an overlapping kind", () => {
    const read = readPersonalSettingRecord("agent", {
      toolsAdded: ["a"], toolsRemoved: ["a"], skillsAdded: ["s"], avatarUrl: 3, unknownField: true,
    });
    expect(read.record).toEqual({ skillsAdded: ["s"] });
    expect(read.skipped).toEqual(expect.arrayContaining(["avatarUrl", "unknownField", "toolsAdded", "toolsRemoved"]));
  });
});

describe("record shape", () => {
  it("orders fields as the file does and drops empty lists", () => {
    expect(JSON.stringify(toRecord({ avatarUrl: "x", toolsRemoved: [], toolsAdded: ["a"] })))
      .toBe(JSON.stringify({ toolsAdded: ["a"], avatarUrl: "x" }));
    expect(toRecord({ toolsAdded: [] })).toBeNull();
  });

  it("allows tools and skills on agents only", () => {
    expect(settingsOfKind("agent")).toEqual(["TOOLS", "SKILLS", "AVATAR", "DEFAULT_LAUNCH_CONFIG"]);
    expect(settingsOfKind("agent_team")).toEqual(["AVATAR", "DEFAULT_LAUNCH_CONFIG"]);
    expect(settingsOfKind("agent_org")).toEqual(["AVATAR", "DEFAULT_LAUNCH_CONFIG"]);
  });
});
