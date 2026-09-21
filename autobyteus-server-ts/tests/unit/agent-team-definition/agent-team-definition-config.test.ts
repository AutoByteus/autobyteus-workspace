import { describe, expect, it } from 'vitest';
import { readAgentTeamDefinitionConfig as read, parseAgentTeamDefinitionConfig as parse } from '../../../src/agent-team-definition/providers/agent-team-definition-config.js';
const config = () => ({ coordinatorMemberName: 'lead', members: [{ memberName: 'lead', ref: 'writer', refScope: 'shared' }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null });
describe('Team input projection, separate from canonical writer validation', () => {
  it('ignores arbitrary metadata at each consumed shape, clones open llmConfig and leaves input untouched', () => {
    const input = { ...config(), schemaVersion: 900, custom: ['opaque'], members: [{ ...config().members[0], refType: 'agent_team', arbitrary: {} }],
      handoffs: [{ from: '/lead', to: '/worker', rules: ['Exact  prose'], metadata: true }],
      defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: 'model', llmConfig: { nested: [{ arbitrary: false }], temperature: 0 }, note: 'unused' } };
    const before = structuredClone(input), output = read(input);
    expect(input).toEqual(before); expect(output).not.toHaveProperty('schemaVersion'); expect(output).not.toHaveProperty('custom');
    expect(output.members).toEqual(config().members); expect(output.handoffs).toEqual([{ from: '/lead', to: '/worker', rules: ['Exact  prose'] }]);
    expect(output.defaultLaunchConfig).toEqual({ runtimeKind: 'autobyteus', llmModelIdentifier: 'model', llmConfig: input.defaultLaunchConfig.llmConfig });
    expect(output.defaultLaunchConfig!.llmConfig).not.toBe(input.defaultLaunchConfig.llmConfig);
    expect(Object.isFrozen(output)).toBe(true); expect(Object.isFrozen(output.members)).toBe(true);
    expect(() => parse(input)).toThrow(); expect(parse(output)).toEqual(output);
  });
  it.each(['missing', 'undefined', 'null'])('accepts only approved default absence: %s', mode => {
    const input: Record<string, unknown> = config();
    if (mode === 'missing') delete input['defaultLaunchConfig'];
    if (mode === 'undefined') input['defaultLaunchConfig'] = undefined;
    expect(read(input)).toEqual(config());
    if (mode !== 'null') expect(() => parse(input)).toThrow();
  });
  it.each(['coordinatorMemberName', 'members', 'handoffs'])('does not invent required %s', key => {
    const input: Record<string, unknown> = config(); delete input[key]; expect(() => read(input)).toThrow();
  });
  it.each([null, [], 'bad', 1])('rejects non-object root %j', value => { expect(() => read(value)).toThrow(); });
  it.each([
    { members: 'bad' }, { members: [null] }, { members: [[]] }, { members: [{}] },
    { members: [{ memberName: ' lead', ref: 'writer', refScope: 'shared' }] },
    { members: [{ memberName: 'lead', ref: '', refScope: 'shared' }] },
    { members: [{ memberName: 'lead', ref: 'writer', refScope: 'org_local' }] },
    { coordinatorMemberName: 'absent' }, { members: [...config().members, { ...config().members[0], memberName: 'LEAD' }] },
    { avatarUrl: false }, { handoffs: 'bad' }, { handoffs: [null] }, { handoffs: [{}] },
    { handoffs: [{ from: '/lead', to: '/worker', rules: [] }] },
    { handoffs: [{ from: '/lead', to: '/worker', rules: [' untrimmed'] }] },
    { defaultLaunchConfig: [] }, { defaultLaunchConfig: false }, { defaultLaunchConfig: {} },
    { defaultLaunchConfig: { runtimeKind: 42, llmModelIdentifier: null, llmConfig: null } },
    { defaultLaunchConfig: { runtimeKind: null, llmModelIdentifier: null, llmConfig: [] } },
  ])('still rejects malformed consumed input %j', delta => { expect(() => read({ ...config(), ...delta })).toThrow(); });
  it('preserves existing explicit null handoff semantics without coercing malformed values', () => {
    expect(read({ ...config(), handoffs: null }).handoffs).toEqual([]);
  });
  it.each(['shared', 'team_local', 'application_owned'])('keeps valid scope %s', refScope => {
    expect(read({ ...config(), members: [{ ...config().members[0], refScope }] }).members[0]?.refScope).toBe(refScope);
  });
});
