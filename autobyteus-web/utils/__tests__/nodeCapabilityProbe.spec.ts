import { describe, expect, it, vi } from 'vitest';
import { probeNodeCapabilities } from '../nodeCapabilityProbe';

describe('probeNodeCapabilities', () => {
  it('returns unknown with conservative capabilities when fetch is unavailable', async () => {
    const result = await probeNodeCapabilities('http://localhost:8000', {
      fetchImpl: undefined as unknown as typeof globalThis.fetch,
    });

    expect(result.state).toBe('unknown');
    expect(result.capabilities).toEqual({
      terminal: false,
      fileExplorerStreaming: false,
    });
    expect(result.error).toContain('fetch');
  });

  it('returns ready when health endpoint is reachable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const result = await probeNodeCapabilities('http://localhost:8000', {
      fetchImpl: fetchMock as unknown as typeof globalThis.fetch,
    });

    expect(result.state).toBe('ready');
    expect(result.capabilities).toEqual({
      terminal: true,
      fileExplorerStreaming: true,
    });
    expect(result.error).toBeNull();
  });

  it('returns degraded when health endpoint returns non-ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const result = await probeNodeCapabilities('http://localhost:8000', {
      fetchImpl: fetchMock as unknown as typeof globalThis.fetch,
    });

    expect(result.state).toBe('degraded');
    expect(result.capabilities).toEqual({
      terminal: false,
      fileExplorerStreaming: false,
    });
    expect(result.error).toContain('503');
  });

  it('returns degraded when probe throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network failure'));

    const result = await probeNodeCapabilities('http://localhost:8000', {
      fetchImpl: fetchMock as unknown as typeof globalThis.fetch,
    });

    expect(result.state).toBe('degraded');
    expect(result.capabilities).toEqual({
      terminal: false,
      fileExplorerStreaming: false,
    });
    expect(result.error).toContain('network failure');
  });
});
