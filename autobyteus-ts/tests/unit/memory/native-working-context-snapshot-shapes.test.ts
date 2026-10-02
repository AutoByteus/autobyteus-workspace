import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ReleasedNativeSnapshotV5Codec as Frozen, recognizeVersionlessSnapshotForPreservation as recognize } from '../../../src/memory/migration/native-working-context-snapshot-shapes.js';
import { WorkingContextSnapshotSerializer as Current } from '../../../src/memory/working-context-snapshot-serializer.js';
const fixture = JSON.parse(fs.readFileSync(new URL('../../fixtures/memory/released-native-snapshot-shapes.json', import.meta.url), 'utf8'));
describe('frozen released snapshot wire boundary', () => {
  it.each(fixture.cases)('pins released classifier: $name', ({ payload, valid }: any) => {
    expect(Frozen.validate(payload)).toBe(valid);
  });
  it('separates preservation from dispatch completeness, even across multiple open groups', () => {
    const { schema_version: _, ...p } = structuredClone(fixture.canonical);
    p.messages.splice(3);
    p.messages.push(structuredClone(p.messages[2]));
    expect(recognize(p, 'agent-frozen')).toBe(true);
    expect(Frozen.validate({ schema_version: 5, ...p })).toBe(false);
    expect(recognize(p, 'different')).toBe(false);
    expect(recognize({ ...p, obsolete: true }, 'agent-frozen')).toBe(false);
  });
  it('keeps the exact released target independently of evolving current write/validation', () => {
    const context = Current.deserialize(fixture.canonical).workingContext;
    const write = vi.spyOn(Current, 'serialize').mockImplementation(() => { throw new Error('No current codec in released target'); });
    const validate = vi.spyOn(Current, 'validate').mockReturnValue(false);
    try {
      const target = Frozen.serialize(context, { agent_id: 'agent-frozen' });
      expect(JSON.parse(JSON.stringify(target))).toEqual(fixture.canonical);
      expect(Frozen.validate(target)).toBe(true);
      expect(write).not.toHaveBeenCalled(); expect(validate).not.toHaveBeenCalled();
    } finally { vi.restoreAllMocks(); }
  });

});
