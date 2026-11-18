import type { AppFontSizePresetId, ResolvedAppFontMetrics } from './appFontSizePresets';
import type { PhoneTextSizeStep } from './phoneTextSizeSteps';

function writeMetrics(metrics: ResolvedAppFontMetrics): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const rootElement = document.documentElement;
  if (!rootElement) {
    return null;
  }

  rootElement.style.fontSize = `${metrics.rootPercent}%`;
  rootElement.style.setProperty('--app-font-size-scale', String(metrics.rootPercent / 100));
  rootElement.style.setProperty('--app-editor-font-size-px', `${metrics.editorFontPx}px`);
  rootElement.style.setProperty('--app-terminal-font-size-px', `${metrics.terminalFontPx}px`);
  return rootElement;
}

/** The desktop: the Display font size preset. */
export function applyAppFontSizeToDocument(
  presetId: AppFontSizePresetId,
  metrics: ResolvedAppFontMetrics,
): void {
  writeMetrics(metrics)?.setAttribute('data-app-font-size', presetId);
}

/** The phone: the Text size step; `data-phone-text-size` also scales the phone's fixed-px text (`phone-text-size.css`). */
export function applyPhoneTextSizeToDocument(
  step: PhoneTextSizeStep,
  metrics: ResolvedAppFontMetrics,
): void {
  writeMetrics(metrics)?.setAttribute('data-phone-text-size', step);
}
