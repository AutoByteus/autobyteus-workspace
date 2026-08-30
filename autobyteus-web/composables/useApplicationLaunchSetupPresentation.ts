import { computed, type Ref } from 'vue'

export const useApplicationLaunchSetupPresentation = (
  presentation: Ref<'page' | 'panel'>,
) => {
  const isPanel = computed(() => presentation.value === 'panel')
  return {
    panelClasses: computed(() => isPanel.value
      ? 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5'
      : 'mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'),
    headerClasses: computed(() => isPanel.value
      ? 'flex flex-col gap-3'
      : 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'),
    slotArticleClasses: computed(() => isPanel.value
      ? 'rounded-2xl border border-slate-200 bg-slate-50/60 p-4'
      : 'rounded-2xl border border-slate-200 bg-slate-50/60 p-5'),
    slotHeaderClasses: computed(() => isPanel.value
      ? 'flex flex-col gap-3'
      : 'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'),
    slotSelectionCardClasses: computed(() => isPanel.value
      ? 'w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'
      : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700'),
    currentSelectionTextClasses: computed(() => isPanel.value
      ? 'mt-1 break-words'
      : 'mt-1 max-w-xs break-words'),
    slotEditorGridClasses: computed(() => 'mt-5 grid gap-5'),
    slotActionRowClasses: computed(() => isPanel.value
      ? 'mt-5 flex flex-col gap-3'
      : 'mt-5 flex flex-wrap items-center gap-3'),
    primaryActionButtonClasses: computed(() => isPanel.value ? 'w-full justify-center' : ''),
    secondaryActionButtonClasses: computed(() => isPanel.value ? 'w-full justify-center' : ''),
  }
}
