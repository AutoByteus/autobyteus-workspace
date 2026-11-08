import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MobileConnectionSheet from '../MobileConnectionSheet.vue';
import { diagnosticForKind } from '~/utils/remoteAccess/mobileConnectionDiagnostics';

const props = { nodeName: 'Office Mac', connected: true, isChecking: false, diagnostic: null };
const sheet = () => document.body.querySelector('[data-testid="mobile-connection-sheet"]')!;
/** Anything that reads as an address: a URL scheme, a host with a domain or a port, an IPv4 address. */
const ADDRESS_SHAPES = [/:\/\//, /\b[\w-]+\.(?:ts\.net|local|lan|home)\b/i, /\b\d{1,3}(?:\.\d{1,3}){3}\b/, /:\d{2,5}\b/];

/** A stand-in for the Android app's web-message object: it answers `hello` and records what the page asks. */
const installShell = (nodeCount: number) => {
  const listeners = new Set<(event: { data: string }) => void>();
  const posted: unknown[] = [];
  (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell = {
    postMessage: (message: string) => {
      const parsed = JSON.parse(message) as { type: string };
      posted.push(parsed);
      if (parsed.type === 'hello') {
        queueMicrotask(() => listeners.forEach((listener) => listener({ data: JSON.stringify({ type: 'shell', nodeCount, deviceName: 'Test Phone' }) })));
      }
    },
    addEventListener: (_type: string, listener: (event: { data: string }) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: { data: string }) => void) => listeners.delete(listener),
  };
  return posted;
};

// one-step-phone-pairing UIS-005: status with refresh/Retry, Switch node in the app, Unpair from <node>; no peer list.
describe('MobileConnectionSheet', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { delete (window as unknown as { AutoByteusShell?: unknown }).AutoByteusShell; });

  it('in a browser: a refresh icon while reachable, no Switch node, no peers, and Unpair from the node', async () => {
    const wrapper = mount(MobileConnectionSheet, { props, attachTo: document.body });
    await flushPromises();
    const check = sheet().querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement;
    expect(check.getAttribute('aria-label')).toBe('Check connection');
    expect(check.textContent?.trim()).toBe('');
    expect(sheet().querySelector('[data-testid="mobile-switch-node"]')).toBeNull();
    expect(sheet().textContent).not.toContain('Peer nodes');
    expect(sheet().textContent).not.toContain('Add a node');
    expect(sheet().querySelector('[data-testid="mobile-unpair"]')!.textContent?.trim()).toBe('Unpair from Office Mac');
    check.click();
    (sheet().querySelector('[data-testid="mobile-unpair"]') as HTMLButtonElement).click();
    expect(wrapper.emitted('check')).toHaveLength(1);
    expect(wrapper.emitted('unpair')).toHaveLength(1);
    const dialog = sheet().querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Office Mac');
    wrapper.unmount();
  });

  // autobyteus-433 AC-002: the name and the state only; no address line, connected or not reachable with its diagnostic.
  it.each([
    ['connected', { connected: true, diagnostic: null }],
    ['not reachable, with its diagnostic', { connected: false, diagnostic: diagnosticForKind('network_unreachable') }],
  ])('shows the node\'s name and state and no address (%s)', async (_state, state) => {
    const wrapper = mount(MobileConnectionSheet, { props: { ...props, ...state }, attachTo: document.body });
    await flushPromises();
    expect(sheet().querySelector('[data-testid="mobile-connection-url"]')).toBeNull();
    expect(sheet().querySelector('[data-testid="mobile-connection-name"]')!.textContent).toBe('Office Mac');
    const text = sheet().textContent ?? '';
    for (const shape of ADDRESS_SHAPES) expect(text).not.toMatch(shape);
    wrapper.unmount();
  });

  it('not reachable: amber "Not reachable" and the word Retry', async () => {
    const wrapper = mount(MobileConnectionSheet, { props: { ...props, connected: false }, attachTo: document.body });
    await flushPromises();
    expect(sheet().querySelector('[data-testid="mobile-connection-status"]')!.textContent).toContain('Not reachable');
    expect(sheet().querySelector('[data-testid="mobile-check-connection"]')!.textContent?.trim()).toBe('Retry');
    wrapper.unmount();
  });

  it('in the Android app: Switch node with the phone\'s node count asks the app for its node list', async () => {
    const posted = installShell(3);
    const wrapper = mount(MobileConnectionSheet, { props, attachTo: document.body });
    await flushPromises();
    expect(sheet().querySelector('[data-testid="mobile-switch-node-count"]')!.textContent?.trim()).toBe('3 nodes on this phone');
    (sheet().querySelector('[data-testid="mobile-switch-node"]') as HTMLButtonElement).click();
    expect(posted).toEqual([{ type: 'hello' }, { type: 'showNodeList' }]);
    wrapper.unmount();
  });
});
