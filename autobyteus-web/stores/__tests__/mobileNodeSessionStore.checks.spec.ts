import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';

// autobyteus-426 D-02 (ARCH-REV-001 AR-001): one outcome per check sets both connection facts.
describe('mobileNodeSessionStore.recordCheckOutcome', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('sets Phone Access off and reachability together, so a later check always replaces "off"', () => {
    const store = useMobileNodeSessionStore();
    store.recordCheckOutcome('phone_access_off');
    expect([store.phoneAccessOff, store.authorizedApiReachable]).toEqual([true, false]);
    store.recordCheckOutcome('unreachable');
    expect([store.phoneAccessOff, store.authorizedApiReachable]).toEqual([false, false]);
    store.recordCheckOutcome('phone_access_off');
    store.recordCheckOutcome('reachable');
    expect([store.phoneAccessOff, store.authorizedApiReachable]).toEqual([false, true]);
  });

  it('forgets Phone Access off when the session ends', () => {
    const store = useMobileNodeSessionStore();
    store.recordCheckOutcome('phone_access_off');
    store.rejectLocalSessionForAuthFailure();
    expect(store.phoneAccessOff).toBe(false);
    store.recordCheckOutcome('phone_access_off');
    store.deleteLocalSession();
    expect(store.phoneAccessOff).toBe(false);
  });
});

// autobyteus-426 D-02 (SR-008, CRR-003 F-API-001): the phone's own credential check.
describe('mobileNodeSessionStore.checkCredential', () => {
  const BASE = 'http://desktop-private.local:29695';
  const answer = (status: number, body?: Record<string, string>) =>
    new Response(body ? JSON.stringify(body) : '', { status, headers: body ? { 'content-type': 'application/json' } : {} });
  let fetchMock: ReturnType<typeof vi.fn>;
  const paired = () => {
    const store = useMobileNodeSessionStore();
    store.session = { entryId: 'mobile-paired-node', serverBaseUrl: BASE, nodeName: 'Office Mac', credential: 'mra_phone_credential', pairedAt: '2026-11-07T00:00:00.000Z' } as never;
    return store;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends one small authorized GraphQL read with the session\'s own credential', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, { data: '{"__typename":"Query"}' } as never));
    expect(await paired().checkCredential()).toBe('reachable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${BASE}/graphql`);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer mra_phone_credential');
    expect(JSON.parse(init.body)).toEqual({ query: 'query PhoneCredentialCheck { __typename }' });
  });

  it.each([
    ['a revoked device', 403, { error: 'REMOTE_ACCESS_DEVICE_REVOKED', code: 'REMOTE_ACCESS_DEVICE_REVOKED', message: 'revoked' }, 'session_rejected'],
    ['Phone Access off', 403, { error: 'PHONE_ACCESS_DISABLED', code: 'PHONE_ACCESS_DISABLED', message: 'off' }, 'phone_access_off'],
    ['a 401 without a body', 401, undefined, 'session_rejected'],
    ['another refusal', 403, { error: 'REMOTE_ACCESS_ORIGIN_REFUSED', code: 'REMOTE_ACCESS_ORIGIN_REFUSED', message: 'origin' }, 'unreachable'],
    ['a gateway error', 502, undefined, 'unreachable'],
  ] as const)('classifies %s', async (_label, status, body, outcome) => {
    fetchMock.mockResolvedValueOnce(answer(status, body as Record<string, string> | undefined));
    expect(await paired().checkCredential()).toBe(outcome);
  });

  it('is unreachable when the read does not get through', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await paired().checkCredential()).toBe('unreachable');
  });
});
