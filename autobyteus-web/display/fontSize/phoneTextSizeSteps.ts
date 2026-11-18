import type { ResolvedAppFontMetrics } from './appFontSizePresets';

/**
 * The phone's Text size (autobyteus-506, autobyteus-525): the source of the app's font metrics on the phone page. Each
 * step's `px` is the conversation's text size; every other phone screen scales by `px / 17` (Standard = today's sizes).
 * Three steps: Standard is the default and the smallest (autobyteus-534). Any other stored value, such as the earlier
 * `small`, reads as Standard.
 */
export const PHONE_TEXT_SIZE_STEPS = [
  { step: 'standard', px: 17 },
  { step: 'large', px: 19 },
  { step: 'largest', px: 21 },
] as const;
export type PhoneTextSizeStep = (typeof PHONE_TEXT_SIZE_STEPS)[number]['step'];

export const DEFAULT_PHONE_TEXT_SIZE_STEP: PhoneTextSizeStep = 'standard';
export const PHONE_TEXT_SIZE_STORAGE_KEY = 'autobyteus.phone.textSize';

/** The Standard step's px: the size at which the phone renders as it did before the setting existed. */
const STANDARD_PX = 17;
/** The desktop's default editor and terminal size, scaled with the step on the phone. */
const BASE_EDITOR_FONT_PX = 14;

export function isPhoneTextSizeStep(value: unknown): value is PhoneTextSizeStep {
  return PHONE_TEXT_SIZE_STEPS.some((entry) => entry.step === value);
}

/** Root 16 px × step/17 (so `1.0625rem` is the step's px); editor and terminal 14 px × step/17, rounded. */
export function phoneTextSizeMetrics(step: PhoneTextSizeStep): ResolvedAppFontMetrics {
  const factor = PHONE_TEXT_SIZE_STEPS.find((entry) => entry.step === step)!.px / STANDARD_PX;
  const codeFontPx = Math.round(BASE_EDITOR_FONT_PX * factor);
  return { rootPercent: factor * 100, editorFontPx: codeFontPx, terminalFontPx: codeFontPx };
}

/** The step kept on this phone; Standard when none is kept, the value is unknown, or storage cannot be read. */
export function readStoredPhoneTextSizeStep(): PhoneTextSizeStep {
  try {
    const stored = window.localStorage.getItem(PHONE_TEXT_SIZE_STORAGE_KEY);
    return isPhoneTextSizeStep(stored) ? stored : DEFAULT_PHONE_TEXT_SIZE_STEP;
  } catch {
    return DEFAULT_PHONE_TEXT_SIZE_STEP;
  }
}

export function writeStoredPhoneTextSizeStep(step: PhoneTextSizeStep): void {
  try {
    window.localStorage.setItem(PHONE_TEXT_SIZE_STORAGE_KEY, step);
  } catch {
    // Storage unavailable: the choice still applies until the page closes.
  }
}
