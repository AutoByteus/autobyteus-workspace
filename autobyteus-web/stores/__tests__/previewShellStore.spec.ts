import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePreviewShellStore } from '../previewShellStore';

describe('previewShellStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });

  it('initializes from the Electron preview shell snapshot', async () => {
    const onPreviewShellSnapshotUpdated = vi.fn(() => vi.fn());
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getPreviewShellSnapshot: vi.fn().mockResolvedValue({
          previewVisible: true,
          activePreviewSessionId: 'preview-session-1',
          sessions: [
            {
              preview_session_id: 'preview-session-1',
              title: 'Demo',
              url: 'http://localhost:3000/demo',
            },
          ],
        }),
        onPreviewShellSnapshotUpdated,
      },
      writable: true,
    });

    const store = usePreviewShellStore();
    await store.initialize();

    expect(store.previewVisible).toBe(true);
    expect(store.activePreviewSessionId).toBe('preview-session-1');
    expect(store.sessions).toHaveLength(1);
    expect(onPreviewShellSnapshotUpdated).toHaveBeenCalledTimes(1);
  });

  it('focusSession applies the updated snapshot returned by Electron', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getPreviewShellSnapshot: vi.fn().mockResolvedValue({
          previewVisible: false,
          activePreviewSessionId: null,
          sessions: [],
        }),
        onPreviewShellSnapshotUpdated: vi.fn(() => vi.fn()),
        focusPreviewSession: vi.fn().mockResolvedValue({
          previewVisible: true,
          activePreviewSessionId: 'preview-session-2',
          sessions: [
            {
              preview_session_id: 'preview-session-2',
              title: 'Other',
              url: 'http://localhost:3000/other',
            },
          ],
        }),
      },
      writable: true,
    });

    const store = usePreviewShellStore();
    await store.focusSession('preview-session-2');

    expect(store.previewVisible).toBe(true);
    expect(store.activePreviewSessionId).toBe('preview-session-2');
    expect(store.sessions[0]?.title).toBe('Other');
  });

  it('ignores identical snapshot updates from Electron', async () => {
    let snapshotListener: ((snapshot: {
      previewVisible: boolean;
      activePreviewSessionId: string | null;
      sessions: Array<{ preview_session_id: string; title: string | null; url: string }>;
    }) => void) | null = null;

    const initialSnapshot = {
      previewVisible: true,
      activePreviewSessionId: 'preview-session-1',
      sessions: [
        {
          preview_session_id: 'preview-session-1',
          title: 'Demo',
          url: 'http://localhost:3000/demo',
        },
      ],
    };

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getPreviewShellSnapshot: vi.fn().mockResolvedValue(initialSnapshot),
        onPreviewShellSnapshotUpdated: vi.fn((callback) => {
          snapshotListener = callback;
          return vi.fn();
        }),
      },
      writable: true,
    });

    const store = usePreviewShellStore();
    await store.initialize();
    const initialSessionsRef = store.sessions;

    snapshotListener?.({
      previewVisible: true,
      activePreviewSessionId: 'preview-session-1',
      sessions: [
        {
          preview_session_id: 'preview-session-1',
          title: 'Demo',
          url: 'http://localhost:3000/demo',
        },
      ],
    });

    expect(store.sessions).toBe(initialSessionsRef);
    expect(store.activePreviewSessionId).toBe('preview-session-1');
    expect(store.previewVisible).toBe(true);
  });
});
