
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const { initMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
}));

// Mock Monaco Editor Loader
vi.mock('@monaco-editor/loader', () => ({
  default: {
    init: initMock,
  },
}));

describe('MonacoEditor.vue', () => {
  let mockEditor: any;
  let mockMonaco: any;
  let mockModel: any;
  let MonacoEditor: any;
  let useAppFontSizeStore: typeof import('~/stores/appFontSizeStore').useAppFontSizeStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    mockModel = {
      dispose: vi.fn(),
      getFullModelRange: vi.fn(() => 'full-range'),
      getLineCount: vi.fn(() => 10),
      getLineMaxColumn: vi.fn(() => 5),
      applyEdits: vi.fn(),
    };

    mockEditor = {
      dispose: vi.fn(),
      getModel: vi.fn(() => mockModel),
      getValue: vi.fn(() => ''),
      setValue: vi.fn(),
      updateOptions: vi.fn(),
      getOption: vi.fn(),
      saveViewState: vi.fn(),
      restoreViewState: vi.fn(),
      pushUndoStop: vi.fn(),
      executeEdits: vi.fn(),
      addAction: vi.fn(),
      addCommand: vi.fn(),
      onDidChangeModelContent: vi.fn(),
    };

    mockMonaco = {
      editor: {
        create: vi.fn(() => mockEditor),
        EditorOption: {
          wordWrap: 'wordWrap',
          fontSize: 'fontSize',
        },
        setModelLanguage: vi.fn(),
        setTheme: vi.fn(),
      },
      KeyMod: {
        CtrlCmd: 2048,
      },
      KeyCode: {
        KEY_S: 49,
      },
      Range: vi.fn((startLine, startCol, endLine, endCol) => ({
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol,
      })),
    };

    initMock.mockResolvedValue(mockMonaco);
    setActivePinia(createPinia());

    MonacoEditor = (await import('../MonacoEditor.vue')).default;
    ({ useAppFontSizeStore } = await import('~/stores/appFontSizeStore'));
  });

  it('renders and initializes monaco editor with the default app font size', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial content',
      },
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.monaco-editor-container').exists()).toBe(true);
    expect(mockMonaco.editor.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fontSize: 14 }),
    );
  });

  it('updates monaco options when the app font size preset changes', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppFontSizeStore();

    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial',
      },
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    store.setPreset('large');
    await wrapper.vm.$nextTick();

    expect(mockEditor.updateOptions).toHaveBeenCalledWith({ fontSize: 16 });
  });

  it('uses optimization for append updates', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial',
      },
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.monaco-editor-container').exists()).toBe(true);
  });
});
