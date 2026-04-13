import type { AppFontSizePresetId, ResolvedAppFontMetrics } from './appFontSizePresets';

export function applyAppFontSizeToDocument(
  presetId: AppFontSizePresetId,
  metrics: ResolvedAppFontMetrics,
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const rootElement = document.documentElement;
  if (!rootElement) {
    return;
  }

  rootElement.style.fontSize = `${metrics.rootPercent}%`;
  rootElement.style.setProperty('--app-font-size-scale', String(metrics.rootPercent / 100));
  rootElement.style.setProperty('--app-editor-font-size-px', `${metrics.editorFontPx}px`);
  rootElement.style.setProperty('--app-terminal-font-size-px', `${metrics.terminalFontPx}px`);
  rootElement.setAttribute('data-app-font-size', presetId);
}
