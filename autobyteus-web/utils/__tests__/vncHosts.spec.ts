import { describe, it, expect } from 'vitest';
import { parseCommaSeparatedHosts } from '../vncHosts';

describe('parseCommaSeparatedHosts', () => {
  it('parses comma-separated entries and normalizes ws scheme', () => {
    const hosts = parseCommaSeparatedHosts('localhost:5900, localhost:5901');

    expect(hosts).toHaveLength(2);
    expect(hosts[0]).toEqual({
      id: 'vnc-0',
      name: 'localhost:5900',
      url: 'ws://localhost:5900',
    });
    expect(hosts[1]).toEqual({
      id: 'vnc-1',
      name: 'localhost:5901',
      url: 'ws://localhost:5901',
    });
  });

  it('keeps existing ws or wss scheme', () => {
    const hosts = parseCommaSeparatedHosts('ws://host:5900,wss://secure:443');

    expect(hosts[0].url).toBe('ws://host:5900');
    expect(hosts[1].url).toBe('wss://secure:443');
  });

  it('ignores empty entries', () => {
    const hosts = parseCommaSeparatedHosts(' , ,host:5902, ');

    expect(hosts).toHaveLength(1);
    expect(hosts[0]).toEqual({
      id: 'vnc-0',
      name: 'host:5902',
      url: 'ws://host:5902',
    });
  });
});
