import WebSocket from 'ws';
import { vi } from 'vitest';

// Provide a WebSocket implementation for graphql-ws in the test environment.
(globalThis as typeof globalThis & { WebSocket?: typeof WebSocket }).WebSocket = WebSocket;

// Some Nuxt internals may invoke `$fetch` on delayed timers after a test completes.
// Ensure it exists in the test runtime to avoid post-teardown ReferenceError noise.
const fetchMock = vi.fn(async () => ({}));
vi.stubGlobal('$fetch', fetchMock);
// Nuxt's app-manifest composable references bare `$fetch` in ESM. Ensure
// a true global binding exists (not just a global object property).
(globalThis as typeof globalThis & { $fetch?: typeof fetchMock }).$fetch = fetchMock;
(0, eval)('var $fetch = globalThis.$fetch');

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: vi.fn().mockResolvedValue({ data: {} }),
    mutate: vi.fn().mockResolvedValue({ data: {} }),
    subscribe: vi.fn(),
  }),
}));
