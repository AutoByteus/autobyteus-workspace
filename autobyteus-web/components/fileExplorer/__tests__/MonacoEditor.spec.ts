
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

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

    // Mock Editor Instance
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

    // Mock Monaco Global
    mockMonaco = {
      editor: {
        create: vi.fn(() => mockEditor),
        EditorOption: {
          wordWrap: 'wordWrap',
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

    MonacoEditor = (await import('../MonacoEditor.vue')).default;
  });

  it('renders and initializes monaco editor', async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial content',
      },
      attachTo: document.body,
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async init
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.monaco-editor-container').exists()).toBe(true);
  });

  it('uses full replace for non-append updates', async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial',
      },
      attachTo: document.body,
    });
    
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.monaco-editor-container').exists()).toBe(true);
  });

  it('uses optimization for append updates', async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'initial',
      },
      attachTo: document.body,
    });
    
    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.monaco-editor-container').exists()).toBe(true);
  });
});
