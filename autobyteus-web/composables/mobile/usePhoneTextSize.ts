import { computed, ref } from 'vue';

/** The phone conversation's Text size steps (autobyteus-506 REQ-002): the conversation's base size in CSS px. */
export const PHONE_TEXT_SIZE_STEPS = [
  { step: 'small', px: 15 },
  { step: 'standard', px: 17 },
  { step: 'large', px: 19 },
  { step: 'largest', px: 21 },
] as const;
export type PhoneTextSizeStep = (typeof PHONE_TEXT_SIZE_STEPS)[number]['step'];

export const PHONE_TEXT_SIZE_STORAGE_KEY = 'autobyteus.phone.textSize';
const DEFAULT_STEP: PhoneTextSizeStep = 'standard';

const isStep = (value: unknown): value is PhoneTextSizeStep => PHONE_TEXT_SIZE_STEPS.some((entry) => entry.step === value);
const readStored = (): PhoneTextSizeStep => {
  try {
    const stored = window.localStorage.getItem(PHONE_TEXT_SIZE_STORAGE_KEY);
    return isStep(stored) ? stored : DEFAULT_STEP;
  } catch {
    return DEFAULT_STEP;
  }
};

/** One phone-wide choice: every run's conversation on this phone uses it, and it is kept on the phone. */
const current = ref<PhoneTextSizeStep>(typeof window === 'undefined' ? DEFAULT_STEP : readStored());

export function usePhoneTextSize() {
  const px = computed(() => PHONE_TEXT_SIZE_STEPS.find((entry) => entry.step === current.value)!.px);
  const set = (step: PhoneTextSizeStep): void => {
    current.value = step;
    try {
      window.localStorage.setItem(PHONE_TEXT_SIZE_STORAGE_KEY, step);
    } catch {
      // Storage unavailable: the choice still applies until the page closes.
    }
  };
  return { step: current, px, set };
}
