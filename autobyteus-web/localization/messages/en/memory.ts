import type { TranslationCatalog } from '../../runtime/types';

const memoryMessages = {
  'memory.components.memory.common.importedReadOnly': 'Imported · read-only',
  'memory.components.memory.MemoryHome.memorySource': 'Memory source',
  'memory.components.memory.MemoryHome.localRunnableMemory': 'Local runnable memory',
  'memory.components.memory.MemoryHome.lastImported': 'Last imported {{timestamp}}',
  'memory.components.memory.MemoryInspector.importedReadOnlyCorpus': 'Imported memory · read-only corpus',
} satisfies TranslationCatalog;

export default memoryMessages;
