import { computed, type Ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { agentActivityPresentation } from '~/utils/agentActivityPresentation';

interface StatusVisuals {
  text: string;
  colorClass: string;
  iconName: string;
}

/** The header's text, dot and icon for an agent's activity (`agentActivityPresentation`, autobyteus-448 DEC-004). */
export function useStatusVisuals(status: Ref<string | undefined>, backgroundTasksRunning?: Ref<number | undefined>) {
  const { t } = useLocalization();
  const visuals = computed((): StatusVisuals => {
    const presentation = agentActivityPresentation({ status: status.value, backgroundTasksRunning: backgroundTasksRunning?.value ?? 0 });
    return { text: t(presentation.labelKey, presentation.labelParams), colorClass: presentation.dotClass, iconName: presentation.iconName };
  });

  return { visuals };
}
