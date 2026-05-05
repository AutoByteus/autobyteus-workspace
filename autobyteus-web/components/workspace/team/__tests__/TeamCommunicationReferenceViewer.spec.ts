import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import TeamCommunicationReferenceViewer from '../TeamCommunicationReferenceViewer.vue';

const windowNodeContextStoreMock = {
  getBoundEndpoints: vi.fn(() => ({ rest: 'http://127.0.0.1:4100/rest/' })),
};

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/utils/fileExplorer/fileUtils', () => ({
  determineFileType: vi.fn(async () => 'Text'),
}));

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamCommunicationPanel.loading_reference': 'Loading reference file...',
  'workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable': 'Reference file unavailable',
  'workspace.components.workspace.team.TeamCommunicationPanel.reference_unavailable_detail': 'The file may have been deleted, moved, or become unreadable.',
  'workspace.components.workspace.team.TeamCommunicationPanel.preview': 'Preview',
  'workspace.components.workspace.team.TeamCommunicationPanel.raw': 'Raw',
  'workspace.components.workspace.team.TeamCommunicationPanel.maximize_view': 'Maximize view',
  'workspace.components.workspace.team.TeamCommunicationPanel.restore_view': 'Restore view',
};

const baseReference = {
  referenceId: 'ref:with/slash',
  path: '/tmp/handoff.md',
  type: 'file' as const,
  createdAt: '2026-04-12T10:00:00.000Z',
  updatedAt: '2026-04-12T10:00:00.000Z',
};

const mountSubject = () => mount(TeamCommunicationReferenceViewer, {
  props: {
    teamRunId: 'team run/1',
    messageId: 'message/1',
    reference: baseReference,
  },
  global: {
    stubs: {
      Icon: true,
      FileViewer: {
        props: ['file', 'error', 'mode'],
        template: '<div data-test="file-viewer"><span data-test="content">{{ file.content }}</span><span data-test="mode">{{ mode }}</span><span data-test="error">{{ error }}</span></div>',
      },
    },
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

describe('TeamCommunicationReferenceViewer.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('fetches text reference bytes from the team-communication message-owned content route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => '# Handoff',
    })));

    const wrapper = mountSubject();
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4100/rest/team-runs/team%20run%2F1/team-communication/messages/message%2F1/references/ref%3Awith%2Fslash/content',
      { cache: 'no-store' },
    );
    expect(wrapper.get('[data-test="content"]').text()).toBe('# Handoff');
  });

  it('shows the unavailable state when the content route returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 404,
      ok: false,
      text: async () => '',
    })));

    const wrapper = mountSubject();
    await flushPromises();

    expect(wrapper.text()).toContain('Reference file unavailable');
    expect(wrapper.text()).toContain('deleted, moved, or become unreadable');
  });

  it('passes non-404 content failures to FileViewer as a read-only error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 403,
      ok: false,
      text: async () => '',
    })));

    const wrapper = mountSubject();
    await flushPromises();

    expect(wrapper.get('[data-test="error"]').text()).toContain('Failed to fetch reference content (403)');
  });

  it('maximizes and restores the Team Communication reference viewer with Escape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => '# Handoff',
    })));

    const wrapper = mountSubject();
    await flushPromises();

    expect(wrapper.get('[data-test="team-reference-viewer-maximize-toggle"]').attributes('title')).toBe('Maximize view');

    await wrapper.get('[data-test="team-reference-viewer-maximize-toggle"]').trigger('click');
    await flushPromises();

    const maximizedShell = document.body.querySelector('[data-test="team-reference-viewer-shell"]');
    const restoreButton = document.body.querySelector('[data-test="team-reference-viewer-maximize-toggle"]');
    expect(maximizedShell?.className).toContain('fixed');
    expect(restoreButton?.getAttribute('title')).toBe('Restore view');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();

    expect(wrapper.get('[data-test="team-reference-viewer-maximize-toggle"]').attributes('title')).toBe('Maximize view');
    expect(wrapper.get('[data-test="team-reference-viewer-shell"]').classes()).not.toContain('fixed');
  });

  it('keeps Raw and Preview controls available and functional while maximized', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => '# Handoff',
    })));

    const wrapper = mountSubject();
    await flushPromises();

    await wrapper.get('[data-test="team-reference-viewer-maximize-toggle"]').trigger('click');
    await flushPromises();

    const rawButton = document.body.querySelector('button[title="Raw"]');
    const previewButton = document.body.querySelector('button[title="Preview"]');
    expect(rawButton).not.toBeNull();
    expect(previewButton).not.toBeNull();
    expect(document.body.querySelector('[data-test="mode"]')?.textContent).toBe('preview');

    rawButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(document.body.querySelector('[data-test="mode"]')?.textContent).toBe('edit');

    previewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(document.body.querySelector('[data-test="mode"]')?.textContent).toBe('preview');
  });
});
