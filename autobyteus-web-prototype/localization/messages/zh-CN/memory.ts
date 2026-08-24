import type { TranslationCatalog } from '../../runtime/types';

const memoryMessages = {
  'memory.components.memory.common.importedReadOnly': '已导入 · 只读',
  'memory.components.memory.MemoryHome.memorySource': '记忆来源',
  'memory.components.memory.MemoryHome.localRunnableMemory': '本地可运行记忆',
  'memory.components.memory.MemoryHome.lastImported': '最近导入 {{timestamp}}',
  'memory.components.memory.MemoryInspector.importedReadOnlyCorpus': '已导入记忆 · 只读语料',
  'memory.components.memory.RawTracesTab.raw_trace_file': '原始轨迹文件',
  'memory.components.memory.RawTracesTab.active_file': '当前',
  'memory.components.memory.RawTracesTab.records': '条记录',
  'memory.components.memory.RawTracesTab.run_scope': '运行范围',
} satisfies TranslationCatalog;

export default memoryMessages;
