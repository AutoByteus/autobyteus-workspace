<template>
  <div ref="editorContainer" class="monaco-editor-container h-full"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { PropType } from 'vue';
import loader from '@monaco-editor/loader';

type WordWrapSetting = 'off' | 'on' | 'wordWrapColumn' | 'bounded';

const normalizeWordWrapInput = (value: unknown): WordWrapSetting | null => {
  if (value === true) return 'on';
  if (value === false) return 'off';
  if (typeof value === 'string') {
    const normalized = value.toLowerCase() as WordWrapSetting;
    if (['off', 'on', 'wordwrapcolumn', 'bounded'].includes(normalized)) {
      // Monaco expects exact casing for wordWrap values
      if (normalized === 'wordwrapcolumn') return 'wordWrapColumn';
      return normalized as WordWrapSetting;
    }
  }
  return null;
};

const getSafeValue = (value: string | null | undefined) => (typeof value === 'string' ? value : '');

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'plaintext'
  },
  theme: {
    type: String,
    default: 'vs'
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  wordWrap: {
    type: [Boolean, String] as PropType<boolean | WordWrapSetting | null>,
    default: null
  },
  options: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'update:wordWrap', 'editorDidMount', 'save']);

const editorContainer = ref<HTMLElement | null>(null);
let editor: any = null;
let monaco: any = null;
let containerKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
let isUnmounted = false;

const initialWordWrap =
  normalizeWordWrapInput(props.wordWrap) ??
  normalizeWordWrapInput((props.options as Record<string, unknown>)?.wordWrap) ??
  'off';

const wordWrapState = ref<WordWrapSetting>(initialWordWrap);

const applyWordWrap = (nextValue: WordWrapSetting) => {
  wordWrapState.value = nextValue;
  if (editor) {
    const current = editor.getOption(monaco.editor.EditorOption.wordWrap);
    if (current !== nextValue) {
      editor.updateOptions({ wordWrap: nextValue });
    }
  }
};

const isWordWrapControlled = () => props.wordWrap !== null && props.wordWrap !== undefined;

const registerContainerShortcuts = () => {
  if (!editorContainer.value || containerKeydownHandler) return;
  containerKeydownHandler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      e.stopPropagation();
      emit('save');
    }
  };
  editorContainer.value.addEventListener('keydown', containerKeydownHandler);
};

const cleanupContainerShortcuts = () => {
  if (editorContainer.value && containerKeydownHandler) {
    editorContainer.value.removeEventListener('keydown', containerKeydownHandler);
  }
  containerKeydownHandler = null;
};

const initMonaco = async () => {
  if (!editorContainer.value) return;

  monaco = await loader.init();

  if (isUnmounted || !editorContainer.value || !editorContainer.value.isConnected) return;

  const { wordWrap: _wordWrap, ...restOptions } = props.options || {};

  editor = monaco.editor.create(editorContainer.value, {
    value: getSafeValue(props.modelValue),
    language: props.language,
    theme: props.theme,
    automaticLayout: true,
    minimap: { enabled: false },
    readOnly: props.readOnly,
    wordWrap: wordWrapState.value,
    ...restOptions
  });

  const toggleWordWrap = () => {
    const nextValue: WordWrapSetting = wordWrapState.value === 'off' ? 'on' : 'off';
    if (!isWordWrapControlled()) {
      applyWordWrap(nextValue);
    }
    emit('update:wordWrap', nextValue === 'on');
  };

  editor.addAction({
    id: 'toggle-word-wrap',
    label: 'Toggle Word Wrap',
    contextMenuGroupId: 'view',
    contextMenuOrder: 1.5,
    run: toggleWordWrap
  });

  // Modified save command handler to ensure event emission
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
    () => {
      console.log('Save command triggered in Monaco Editor');
      emit('save');
    }
  );

  editor.onDidChangeModelContent(() => {
    const value = editor.getValue();
    emit('update:modelValue', value);
  });

  emit('editorDidMount', editor);
};

watch(() => props.modelValue, (newValue) => {
  if (!editor) return;
  const safeValue = getSafeValue(newValue);
  const currentValue = editor.getValue();
  
  if (safeValue === currentValue) return;

  const model = editor.getModel();
  if (!model) return;

  // Optimization: If new value is an append of the current value, only append the delta.
  // This prevents full re-tokenization and flashing for streaming updates.
  if (safeValue.startsWith(currentValue)) {
    const delta = safeValue.slice(currentValue.length);
    const lineCount = model.getLineCount();
    const lastLineLength = model.getLineMaxColumn(lineCount);
    
    // Create range at the very end of the file
    const endRange = new monaco.Range(
      lineCount,
      lastLineLength,
      lineCount,
      lastLineLength
    );

    model.applyEdits([{
      range: endRange,
      text: delta,
      forceMoveMarkers: true
    }]);
    
    return;
  }

  // Fallback: Full replacement for non-append updates
  const viewState = editor.saveViewState();
  const fullRange = model.getFullModelRange();

  editor.pushUndoStop();
  // Use model.applyEdits for full replacement as well to avoid undo stack pollution during sync
  model.applyEdits([{
    range: fullRange,
    text: safeValue,
    forceMoveMarkers: true
  }]);
  editor.pushUndoStop();

  if (viewState) {
    editor.restoreViewState(viewState);
  }
});

watch(() => props.language, (newValue) => {
  if (editor && monaco) {
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, newValue);
    }
  }
});

watch(() => props.theme, (newTheme) => {
  if (monaco && newTheme) {
    monaco.editor.setTheme(newTheme);
  }
});

watch(() => props.options, (newOptions) => {
  if (!editor || !newOptions) return;
  const { wordWrap: optionsWordWrap, ...restOptions } = newOptions as Record<string, unknown>;
  if (Object.keys(restOptions).length) {
    editor.updateOptions(restOptions);
  }

  if (!isWordWrapControlled()) {
    const normalized = normalizeWordWrapInput(optionsWordWrap);
    if (normalized) {
      applyWordWrap(normalized);
    }
  }
}, { deep: true });

watch(() => props.readOnly, (newValue) => {
  if (editor) {
    editor.updateOptions({ readOnly: newValue });
  }
});

watch(() => props.wordWrap, (newValue) => {
  const normalized = normalizeWordWrapInput(newValue);
  if (!normalized) return;
  if (normalized !== wordWrapState.value) {
    applyWordWrap(normalized);
  }
});

onMounted(async () => {
  await initMonaco();
  registerContainerShortcuts();
});

onBeforeUnmount(() => {
  isUnmounted = true;
  if (editor) {
    const model = editor.getModel();
    editor.dispose();
    model?.dispose();
  }
  cleanupContainerShortcuts();
});

defineExpose({
  getEditor: () => editor,
  getMonaco: () => monaco
});
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  min-height: 300px;
  border-radius: 0.375rem;
  overflow: hidden;
}
</style>
