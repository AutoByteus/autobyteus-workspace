<template>
  <div
    data-test="workspace-center-loading-indicator"
    class="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-sm">
      <span
        aria-hidden="true"
        class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600"
      />
      <span>{{ $t('shell.components.layout.loading_selected_run_history') }}</span>
    </div>
  </div>
</template>
