import { nextTick, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import type { PersonalSetting } from '~/types/personalSettings'

/**
 * One "Reset to the package's setting" action in an editor. The reset is saved at once; the editor
 * then takes the reset setting's value from the server and keeps the user's other unsaved edits:
 * while the reset's own refresh of the definition arrives, `isApplyingReset()` is true and the
 * editor's refill from its loaded definition is skipped.
 */
export function usePersonalSettingReset() {
  const { t } = useLocalization()
  const resetting = ref<PersonalSetting | null>(null)
  const resetError = ref<string | null>(null)
  let applying = false

  const runReset = async <T>(setting: PersonalSetting, reset: () => Promise<T>, apply: (result: T) => void): Promise<void> => {
    resetting.value = setting
    resetError.value = null
    applying = true
    try {
      const result = await reset()
      await nextTick()
      apply(result)
    } catch (error) {
      resetError.value = t('personalSettings.reset.failed', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      applying = false
      resetting.value = null
    }
  }

  return { resetting, resetError, isApplyingReset: () => applying, runReset }
}
