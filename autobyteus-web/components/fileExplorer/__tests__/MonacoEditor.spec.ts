
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
    // autobyteus-647 D-1 (REQ-001): no line numbers, folding column or glyph margin; a 6 px margin before the text.
    expect(mockMonaco.editor.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lineNumbers: 'off', lineNumbersMinChars: 0, glyphMargin: false, folding: false, lineDecorationsWidth: 6 }),
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

  /** Mounts the editor and waits for Monaco to be created; returns the "Toggle Word Wrap" action's run. */
  const mountEditor = async (props: Record<string, unknown> = {}) => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(MonacoEditor, { props: { modelValue: 'a long line', ...props }, global: { plugins: [pinia] }, attachTo: document.body });
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    const action = mockEditor.addAction.mock.calls.map(([entry]: [any]) => entry).find((entry: any) => entry.id === 'toggle-word-wrap');
    // The editor reports the wrap it was last given, as Monaco does.
    let current = mockMonaco.editor.create.mock.calls[0][1].wordWrap;
    mockEditor.getOption.mockImplementation((option: string) => (option === 'wordWrap' ? current : undefined));
    mockEditor.updateOptions.mockImplementation((options: Record<string, unknown>) => { if ('wordWrap' in options) current = options.wordWrap; });
    return { wrapper, toggle: () => action.run(), wrap: () => current };
  };

  it('opens with word wrap on when no caller sets it (autobyteus-618 REQ-001)', async () => {
    const { wrap } = await mountEditor();
    expect(mockMonaco.editor.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ wordWrap: 'on' }));
    expect(wrap()).toBe('on');
  });

  it('"Toggle Word Wrap" turns wrap off and on again (AC-002)', async () => {
    const { wrapper, toggle, wrap } = await mountEditor();
    toggle();
    expect(wrap()).toBe('off');
    toggle();
    expect(wrap()).toBe('on');
    expect(wrapper.emitted('update:wordWrap')).toEqual([[false], [true]]);
  });

  it('a value the caller passes still wins, as the prop or in options (AC-003)', async () => {
    await mountEditor({ wordWrap: 'off' });
    expect(mockMonaco.editor.create.mock.calls[0][1].wordWrap).toBe('off');
    mockMonaco.editor.create.mockClear();
    await mountEditor({ options: { wordWrap: false } });
    expect(mockMonaco.editor.create.mock.calls[0][1].wordWrap).toBe('off');
  });
});
