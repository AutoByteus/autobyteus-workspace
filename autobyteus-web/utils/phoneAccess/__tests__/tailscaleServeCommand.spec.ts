import { describe, expect, it } from 'vitest';
import type { NodeEntry } from '~/types/node';
import { buildTailscaleServeCommand, tailscaleServeHttpsPortFor } from '../tailscaleServeCommand';

const entry = (id: string, baseUrl: string, createdAt: string, nodeType: NodeEntry['nodeType'] = 'remote'): NodeEntry =>
  ({ id, name: id, baseUrl, nodeType, createdAt, updatedAt: createdAt });

describe('tailscaleServeCommand', () => {
  it("gives this computer's other nodes 8443 + their position by when they were added; adding one changes no other", () => {
    const entries = [
      entry('embedded-local', 'http://127.0.0.1:29695', '2026-01-01T00:00:00.000Z', 'embedded'),
      entry('docker-b', 'http://localhost:8003', '2026-03-01T00:00:00.000Z'),
      entry('office', 'http://192.168.1.50:29695', '2026-02-15T00:00:00.000Z'),
      entry('docker-a', 'http://localhost:8001', '2026-02-01T00:00:00.000Z'),
    ];
    expect(tailscaleServeHttpsPortFor('docker-a', entries)).toBe(8443);
    expect(tailscaleServeHttpsPortFor('docker-b', entries)).toBe(8444);
    expect(tailscaleServeHttpsPortFor('office', entries)).toBeNull();
    expect(tailscaleServeHttpsPortFor('embedded-local', entries)).toBeNull();

    const withNewer = [...entries, entry('docker-c', 'http://127.0.0.1:8005', '2026-04-01T00:00:00.000Z')];
    expect(tailscaleServeHttpsPortFor('docker-a', withNewer)).toBe(8443);
    expect(tailscaleServeHttpsPortFor('docker-b', withNewer)).toBe(8444);
    expect(tailscaleServeHttpsPortFor('docker-c', withNewer)).toBe(8445);
  });

  it("builds the one command with the node's own port, and never a reset", () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
    expect(buildTailscaleServeCommand({ platform: mac, nodePort: 29695, httpsPort: null }))
      .toBe('/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 29695');
    expect(buildTailscaleServeCommand({ platform: 'Mozilla/5.0 (X11; Linux x86_64)', nodePort: 8001, httpsPort: 8443 }))
      .toBe('tailscale serve --bg --https=8443 8001');
    expect(buildTailscaleServeCommand({ platform: mac, nodePort: 8001, httpsPort: 8443 })).not.toContain('reset');
  });
});
