import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useMemorySearchStore } from '~/stores/memorySearchStore';
import type { IndexStep } from '~/types/memorySearch';

/**
 * How the memory index reads on the Memory page (work-journal-search): one status for the Index tab,
 * the badge on its label and the notice on the Search tab, and the text of each step.
 */
export function useMemoryIndexView() {
  const { t } = useLocalization();
  const store = useMemorySearchStore();
  void store.loadIndexStatus();

  const index = computed(() => store.index);

  const fmt = (value: number) => value.toLocaleString();
  const percent = (step: IndexStep) => (step.total ? Math.floor((step.done / step.total) * 100) : 0);
  const unit = (step: IndexStep) => t(step.id === 'text' || step.id === 'meaning' ? 'memory.index.unit.files' : 'memory.index.unit.runs');
  const stepName = (id: string) => t(`memory.index.step.${id}.name`);

  const stepCount = (step: IndexStep): string => {
    if (step.state === 'waiting') return t('memory.index.state.waiting');
    if (step.state === 'done') return `${fmt(step.total)} ${unit(step)}`;
    return t('memory.index.count', { done: fmt(step.done), total: fmt(step.total), unit: unit(step), percent: percent(step) });
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  /** Tone: dot colour; `spinner` while a step runs. `attention` = the user may need to act. */
  const status = computed(() => {
    const value = index.value;
    const none = { spinner: false, attention: false, dot: 'bg-gray-300', text: 'text-gray-600', label: '', detail: '' };
    if (!value) return none;
    if (value.phase === 'needs_index') return { ...none, attention: true, dot: 'bg-amber-400', text: 'text-gray-700', label: t('memory.index.status.needs_index') };
    if (value.phase === 'failed') {
      const failed = value.steps.find(s => s.state === 'failed');
      return { ...none, attention: true, dot: 'bg-red-500', text: 'text-red-700', label: t('memory.index.status.failed', { step: failed ? stepName(failed.id) : '' }) };
    }
    if (value.phase === 'building') {
      const current = value.steps.find(s => s.state === 'running') ?? value.steps.find(s => s.state === 'waiting');
      if (current?.id === 'meaning') {
        return { ...none, spinner: true, text: 'text-gray-700', label: t('memory.index.status.meaning_running', { percent: percent(current) }), detail: t('memory.index.status.words_ready') };
      }
      return { ...none, spinner: true, text: 'text-gray-700', label: t('memory.index.status.building', { number: value.steps.findIndex(s => s.id === current?.id) + 1, step: current ? stepName(current.id) : '', percent: current ? percent(current) : 0 }) };
    }
    if (store.modelChanged) return { ...none, attention: true, dot: 'bg-amber-400', text: 'text-amber-800', label: t('memory.index.status.model_changed') };
    return { ...none, dot: 'bg-emerald-500', text: 'text-gray-700', label: t('memory.index.status.ready'), detail: t('memory.index.status.ready_detail', { runs: fmt(value.runCount), timestamp: formatTimestamp(value.updatedAt) }) };
  });

  /** What the label of the Index tab shows next to its name. */
  const badge = computed(() => {
    const value = index.value;
    if (!value) return null;
    if (value.phase === 'building') {
      const current = value.steps.find(s => s.state === 'running') ?? value.steps.find(s => s.state === 'waiting');
      return { spinner: true, dot: '', text: current ? `${percent(current)}%` : '' };
    }
    if (status.value.attention) return { spinner: false, dot: status.value.dot, text: '' };
    return null;
  });

  return { store, index, status, badge, percent, stepCount, formatTimestamp, fmt };
}
