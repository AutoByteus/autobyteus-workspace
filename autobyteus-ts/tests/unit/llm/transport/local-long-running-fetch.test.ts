import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUndiciFetch = vi.hoisted(() => vi.fn());
const mockAgentConstructor = vi.hoisted(
  () =>
    vi.fn(function (this: Record<string, unknown>, options: Record<string, unknown>) {
      this.options = options;
    }),
);

vi.mock('undici', () => ({
  Agent: mockAgentConstructor,
  fetch: mockUndiciFetch,
}));

describe('createLocalLongRunningFetch', () => {
  beforeEach(() => {
    vi.resetModules();
    mockUndiciFetch.mockReset();
    mockAgentConstructor.mockClear();
  });

  it('creates a single shared dispatcher with idle transport timeouts disabled', async () => {
    const { createLocalLongRunningFetch } = await import(
      '../../../../src/llm/transport/local-long-running-fetch.js'
    );

    const fetchA = createLocalLongRunningFetch();
    const fetchB = createLocalLongRunningFetch();

    expect(fetchA).toBe(fetchB);
    expect(mockAgentConstructor).toHaveBeenCalledTimes(1);
    expect(mockAgentConstructor).toHaveBeenCalledWith({
      bodyTimeout: 0,
      headersTimeout: 0,
    });
  });

  it('routes requests through undici.fetch with the shared dispatcher', async () => {
    const { createLocalLongRunningFetch } = await import(
      '../../../../src/llm/transport/local-long-running-fetch.js'
    );
    const localFetch = createLocalLongRunningFetch();
    const mockResponse = { ok: true } as Response;
    mockUndiciFetch.mockResolvedValue(mockResponse);

    const response = await localFetch('http://127.0.0.1:1234/v1/chat/completions', {
      method: 'POST',
    });

    expect(response).toBe(mockResponse);
    expect(mockUndiciFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1234/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        dispatcher: mockAgentConstructor.mock.instances[0],
      }),
    );
  });
});
