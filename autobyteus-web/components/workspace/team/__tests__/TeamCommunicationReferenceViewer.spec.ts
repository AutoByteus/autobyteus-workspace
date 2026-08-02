import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamCommunicationReferenceViewer from '../TeamCommunicationReferenceViewer.vue';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import type { TeamCommunicationReferenceFileType } from '~/stores/teamCommunicationTypes';
import type { FileDataType } from '~/stores/fileExplorer';
import { mobileCredentialStorage } from '~/utils/remoteAccess/mobileCredentialStorage';
import type { MobileNodeSession } from '~/types/remoteAccess';

const { determineFileTypeMock } = vi.hoisted(() => ({
  determineFileTypeMock: vi.fn(),
}));

const windowNodeContextStoreMock = {
  getBoundEndpoints: vi.fn(() => ({ rest: 'http://127.0.0.1:4100/rest/' })),
  bindNodeContext: vi.fn(),
};

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/utils/fileExplorer/fileUtils', () => ({
  determineFileType: determineFileTypeMock,
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

const storedSession = (): MobileNodeSession => ({
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://127.0.0.1:4100',
  credential: 'mra_secret',
  pairedAt: '2026-05-16T00:00:00.000Z',
  device: {
    deviceId: 'device-1',
    displayName: 'Phone',
    clientFacingBaseUrl: 'http://127.0.0.1:4100',
    createdAt: '2026-05-16T00:00:00.000Z',
    lastSeenAt: null,
    revokedAt: null,
  },
});

const mountSubject = (props: Record<string, unknown> = {}) => mount(TeamCommunicationReferenceViewer, {
  props: {
    teamRunId: 'team run/1',
    messageId: 'message/1',
    reference: baseReference,
    ...props,
  },
  global: {
    stubs: {
      Icon: true,
      FileViewer: {
        props: ['file', 'error', 'mode'],
        template: '<div data-test="file-viewer"><span data-test="type">{{ file.type }}</span><span data-test="content">{{ file.content }}</span><span data-test="url">{{ file.url }}</span><span data-test="mode">{{ mode }}</span><span data-test="error">{{ error }}</span></div>',
      },
    },
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

describe('TeamCommunicationReferenceViewer.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.clearAllMocks();
    determineFileTypeMock.mockResolvedValue('Text');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('fetches text reference bytes from the team-communication message-owned content route', async () => {
    mobileCredentialStorage.save(storedSession());
    useMobileNodeSessionStore().initializeFromStorage();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => '# Handoff',
    })));

    const wrapper = mountSubject();
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4100/rest/team-runs/team%20run%2F1/team-communication/messages/message%2F1/references/ref%3Awith%2Fslash/content',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.any(Headers),
      }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer mra_secret');
    expect(wrapper.get('[data-test="content"]').text()).toBe('# Handoff');
  });

  it.each([
    ['image', 'Image', '/tmp/screenshot.png'],
    ['audio', 'Audio', '/tmp/clip.mp3'],
    ['video', 'Video', '/tmp/demo.mp4'],
    ['pdf', 'PDF', '/tmp/spec.pdf'],
    ['csv', 'Excel', '/tmp/data.csv'],
    ['excel', 'Excel', '/tmp/report.xlsx'],
  ] satisfies Array<[TeamCommunicationReferenceFileType, FileDataType, string]>)(
    'fetches %s reference bytes through the authorized route and passes a blob URL to FileViewer',
    async (referenceType, expectedFileType, path) => {
      mobileCredentialStorage.save(storedSession());
      useMobileNodeSessionStore().initializeFromStorage();
      const blob = new Blob(['binary'], { type: 'application/octet-stream' });
      const createObjectURL = vi.fn(() => `blob:${referenceType}-reference`);
      vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 200,
        ok: true,
        blob: async () => blob,
      })));
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: createObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: vi.fn(),
      });

      const wrapper = mountSubject({
        reference: {
          ...baseReference,
          referenceId: `${referenceType}-ref`,
          path,
          type: referenceType,
        },
      });
      await flushPromises();

      expect(fetch).toHaveBeenCalledWith(
        `http://127.0.0.1:4100/rest/team-runs/team%20run%2F1/team-communication/messages/message%2F1/references/${referenceType}-ref/content`,
        expect.objectContaining({
          cache: 'no-store',
          headers: expect.any(Headers),
        }),
      );
      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect((init?.headers as Headers).get('Authorization')).toBe('Bearer mra_secret');
      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(wrapper.get('[data-test="type"]').text()).toBe(expectedFileType);
      expect(wrapper.get('[data-test="url"]').text()).toBe(`blob:${referenceType}-reference`);
    },
  );

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

  it('uses the shared-policy fallback for an SVG team reference and revokes its blob URL', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    mobileCredentialStorage.save(storedSession());
    useMobileNodeSessionStore().initializeFromStorage();
    const blob = new Blob(['<svg'], { type: 'image/svg+xml' });
    const createObjectURL = vi.fn(() => 'blob:svg-team-reference');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      blob: async () => blob,
    })));
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    const wrapper = mountSubject({
      reference: {
        ...baseReference,
        referenceId: 'svg-ref',
        path: '/tmp/DIAGRAM.SVG',
        type: 'file',
      },
    });
    await flushPromises();

    expect(determineFileTypeMock).toHaveBeenCalledWith('/tmp/DIAGRAM.SVG');
    expect(wrapper.get('[data-test="type"]').text()).toBe('Image');
    expect(wrapper.get('[data-test="url"]').text()).toBe('blob:svg-team-reference');
    expect(createObjectURL).toHaveBeenCalledWith(blob);

    wrapper.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:svg-team-reference');
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

  it('can disable rich HTML preview for mobile while keeping raw authorized content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => '<h1>Safe raw view</h1>',
    })));

    const wrapper = mountSubject({
      disableRichTextPreview: true,
      reference: {
        ...baseReference,
        referenceId: 'html-ref',
        path: '/tmp/page.html',
      },
    });
    await flushPromises();

    expect(wrapper.get('[data-test="mode"]').text()).toBe('edit');
    expect(wrapper.find('button[title="Preview"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="content"]').text()).toContain('Safe raw view');
  });
});
