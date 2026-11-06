import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MobileConnectionSheet from '../MobileConnectionSheet.vue';
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore';
import { useRemoteCollaborationOffersStore } from '~/stores/remoteCollaborationOffersStore';

const props = { nodeName: 'AutoByteus Desktop', serverBaseUrl: 'http://100.64.0.1:29695', connected: true, isChecking: false, diagnostic: null };
const sheet = () => document.body.querySelector('[data-testid="mobile-connection-sheet"]')!;

// autobyteus-277 REQ-008, DEC-003 A: the paired node and its peers, read only.
describe('MobileConnectionSheet', () => {
  beforeEach(() => { setActivePinia(createPinia()); document.body.innerHTML = ''; });

  it('lists the peers with what they offer or "Not reachable", asking every peer at once when it opens', async () => {
    const peers = useRemoteCollaborationStore();
    const offers = useRemoteCollaborationOffersStore();
    vi.spyOn(peers, 'load').mockImplementation(async () => { peers.peers = [{ nodeId: 'n1', name: 'docker' }, { nodeId: 'n2', name: 'office-mac' }] as never; });
    const askAll = vi.spyOn(offers, 'askAll').mockImplementation(() => {
      offers.peers = {
        n1: { phase: 'available', checkedAt: 'now', entries: [...Array(6)].map((_, i) => ({ name: `a${i}`, kind: 'agent' })).concat([...Array(3)].map((_, i) => ({ name: `t${i}`, kind: 'agent_team' }))) },
        n2: { phase: 'unavailable', code: 'PEER_UNREACHABLE' },
      } as never;
    });
    const wrapper = mount(MobileConnectionSheet, { props, attachTo: document.body });
    await flushPromises();
    expect(askAll).toHaveBeenCalledWith(peers.peers);
    expect(sheet().querySelector('[data-testid="mobile-connection-name"]')!.textContent).toBe('AutoByteus Desktop');
    expect(sheet().querySelector('[data-testid="mobile-connection-status"]')!.textContent).toContain('Connected');
    expect([...sheet().querySelectorAll('[data-testid="mobile-peer-detail"]')].map((detail) => detail.textContent?.trim()))
      .toEqual(['6 agents · 3 teams', 'Not reachable']);
    expect(sheet().textContent).toContain('Peer nodes');
    wrapper.unmount();
  });

  it('without peers the Peer nodes section is absent; Check connection and Unpair this phone are there', async () => {
    vi.spyOn(useRemoteCollaborationStore(), 'load').mockResolvedValue(undefined);
    const wrapper = mount(MobileConnectionSheet, { props, attachTo: document.body });
    await flushPromises();
    expect(sheet().querySelector('[data-testid="mobile-peers"]')).toBeNull();
    (sheet().querySelector('[data-testid="mobile-check-connection"]') as HTMLButtonElement).click();
    (sheet().querySelector('[data-testid="mobile-unpair"]') as HTMLButtonElement).click();
    expect(wrapper.emitted('check')).toHaveLength(1);
    expect(wrapper.emitted('unpair')).toHaveLength(1);
    expect(sheet().querySelector('[role="dialog"]')!.getAttribute('aria-modal')).toBe('true');
    // CRR-001 CR-003: the dialog is named by its heading, the node's name.
    const dialog = sheet().querySelector('[role="dialog"]')!;
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe('AutoByteus Desktop');
    wrapper.unmount();
  });
});
