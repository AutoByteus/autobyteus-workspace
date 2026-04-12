import {
  Agent,
  fetch as undiciFetch,
  type Dispatcher,
  type RequestInfo,
  type RequestInit as UndiciRequestInit,
} from 'undici';

export const LOCAL_PROVIDER_SDK_TIMEOUT_MS = 24 * 60 * 60 * 1000;

let sharedDispatcher: Dispatcher | null = null;
let sharedFetch: typeof fetch | null = null;

type LocalLongRunningRequestInit = UndiciRequestInit & {
  dispatcher?: Dispatcher;
};

function getSharedDispatcher(): Dispatcher {
  if (!sharedDispatcher) {
    sharedDispatcher = new Agent({
      bodyTimeout: 0,
      headersTimeout: 0,
    });
  }

  return sharedDispatcher;
}

export function createLocalLongRunningFetch(): typeof fetch {
  if (!sharedFetch) {
    const dispatcher = getSharedDispatcher();
    sharedFetch = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      undiciFetch(input as RequestInfo, {
        ...(init as LocalLongRunningRequestInit | undefined),
        dispatcher,
      }) as ReturnType<typeof fetch>) as typeof fetch;
  }

  return sharedFetch;
}
