import { describe, expect, it } from 'vitest';
import { nodeNameOrDefault, UNNAMED_NODE_NAME } from '../nodeName';

// autobyteus-433: a node on the phone page is shown by a name, never by its address.
describe('nodeNameOrDefault', () => {
  it('takes the first non-blank name, in the given order', () => {
    expect(nodeNameOrDefault('Test Desktop', 'Test Node')).toBe('Test Desktop');
    expect(nodeNameOrDefault('', 'Test Node')).toBe('Test Node');
    expect(nodeNameOrDefault(undefined, null, 'Test Node')).toBe('Test Node');
  });

  it('trims the name it takes and skips names that are only spaces', () => {
    expect(nodeNameOrDefault('  Test Desktop  ')).toBe('Test Desktop');
    expect(nodeNameOrDefault('   ', 'Test Node')).toBe('Test Node');
  });

  it('is "AutoByteus node" when no name is given', () => {
    expect(UNNAMED_NODE_NAME).toBe('AutoByteus node');
    expect(nodeNameOrDefault()).toBe('AutoByteus node');
    expect(nodeNameOrDefault('', undefined, null, ' ')).toBe('AutoByteus node');
  });
});
