import { describe, expect, it } from "vitest";
import { readAgentTeamDefinitionConfig, parseAgentTeamDefinitionConfig } from "../../../src/agent-team-definition/providers/agent-team-definition-config.js";
import { readAgentOrgDefinitionConfig, parseAgentOrgDefinitionConfig } from "../../../src/agent-org-definition/providers/agent-org-definition-config.js";
import { normalizeAgentConfigRecord } from "../../../src/agent-definition/providers/agent-definition-config.js";

const team = () => ({
  coordinatorMemberName: "lead",
  members: [{ memberName: "lead", ref: "writer", refScope: "shared" }],
  handoffs: [], defaultLaunchConfig: null,
});
const org = () => ({
  members: [{ memberName: "lead", ref: "writer", refScope: "shared", refType: "agent" }],
  handoffs: [], defaultLaunchConfig: null,
});

describe.each([
  { family: "Team", config: team, read: readAgentTeamDefinitionConfig, parse: parseAgentTeamDefinitionConfig },
  { family: "Org", config: org, read: readAgentOrgDefinitionConfig, parse: parseAgentOrgDefinitionConfig },
])("$family optional avatar input / strict canonical output", ({ config, read, parse }) => {
  it.each(["omitted", "undefined", "null", "supplied"])("normalizes %s without mutating input", mode => {
    const input: Record<string, unknown> = config();
    if (mode !== "omitted") input["avatarUrl"] = mode === "undefined" ? undefined : mode === "null" ? null : "https://example.test/avatar.svg";
    const before = structuredClone(input);
    Object.freeze(input);
    const output = read(input);
    expect(output.avatarUrl).toBe(mode === "supplied" ? input["avatarUrl"] : null);
    expect(input).toEqual(before);
    expect(Object.isFrozen(output)).toBe(true);
    expect(parse(output)).toEqual(output);
    if (mode === "omitted" || mode === "undefined") expect(() => parse(input)).toThrow();
  });
  it.each([false, 42, {}, [], "", "  ", " https://example.test/avatar.svg"])("rejects malformed present avatar %j", avatarUrl => {
    expect(() => read({ ...config(), avatarUrl })).toThrow(/avatarUrl/);
  });
});

describe("Org reader keeps every non-avatar contract", () => {
  it.each([null, [], "bad", 42])("rejects non-object root %j", input => {
    expect(() => readAgentOrgDefinitionConfig(input)).toThrow(/must be an object/);
  });
  it.each(["members", "handoffs", "defaultLaunchConfig"])("does not default missing %s", key => {
    const input: Record<string, unknown> = org();
    delete input[key];
    expect(() => readAgentOrgDefinitionConfig(input)).toThrow();
  });
  it.each([
    { extra: true }, { schemaVersion: 1 }, { defaultLaunchConfig: undefined },
    { defaultLaunchConfig: {} }, { defaultLaunchConfig: { runtimeKind: null, llmModelIdentifier: null, llmConfig: [] } },
    { members: [{ ...org().members[0], extra: true }] },
    { members: [{ ...org().members[0], refScope: "team_local" }] },
    { members: [{ ...org().members[0], refType: "org" }] },
    { handoffs: [{ from: "/lead", to: "/missing", rules: [] }] },
  ])("preserves strict semantics %j", delta => {
    expect(() => readAgentOrgDefinitionConfig({ ...org(), ...delta })).toThrow();
  });
  it("retains supplied launch configuration and clones its open llmConfig", () => {
    const input = { ...org(), defaultLaunchConfig: { runtimeKind: "autobyteus", llmModelIdentifier: "model", llmConfig: { custom: [1, 2] } } };
    const output = readAgentOrgDefinitionConfig(input);
    expect(output.defaultLaunchConfig).toEqual(input.defaultLaunchConfig);
    expect(output.defaultLaunchConfig!.llmConfig).not.toBe(input.defaultLaunchConfig.llmConfig);
  });
});

describe("Agent existing normalization remains intentionally unchanged", () => {
  it.each([undefined, null, 42, false, {}, []])("normalizes %j to no avatar", avatarUrl => {
    expect(normalizeAgentConfigRecord({ avatarUrl } as never).avatarUrl).toBeNull();
  });
  it("keeps the existing string policy, not the stricter collaboration-family policy", () => {
    for (const avatarUrl of ["https://example.test/avatar.svg", "", " untrimmed "]) {
      expect(normalizeAgentConfigRecord({ avatarUrl }).avatarUrl).toBe(avatarUrl);
    }
    expect(normalizeAgentConfigRecord({}).avatarUrl).toBeNull();
  });
});
