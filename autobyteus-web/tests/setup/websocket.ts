import WebSocket from 'ws';
import { vi } from 'vitest';

// Provide a WebSocket implementation for graphql-ws in the test environment.
(globalThis as typeof globalThis & { WebSocket?: typeof WebSocket }).WebSocket = WebSocket;

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: vi.fn().mockResolvedValue({ data: {} }),
    mutate: vi.fn().mockResolvedValue({ data: {} }),
    subscribe: vi.fn(),
  }),
}));
