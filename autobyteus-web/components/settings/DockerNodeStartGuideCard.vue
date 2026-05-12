<template>
  <section class="border border-blue-200 bg-blue-50 rounded-lg p-4" data-testid="docker-node-start-guide-card">
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">
          {{ t('settings.components.settings.DockerNodeStartGuideCard.eyebrow') }}
        </p>
        <h3 class="mt-1 text-sm font-semibold text-blue-950">
          {{ t('settings.components.settings.DockerNodeStartGuideCard.title') }}
        </h3>
        <p class="mt-1 text-sm text-blue-900">
          {{ t('settings.components.settings.DockerNodeStartGuideCard.description') }}
        </p>
      </div>
    </div>

    <div class="mt-4">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-blue-800">
        {{ t('settings.components.settings.DockerNodeStartGuideCard.installStepTitle') }}
      </h4>
      <div class="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div
          v-for="command in installCommands"
          :key="command.id"
          class="rounded-lg border border-blue-100 bg-white/80 p-3 shadow-sm"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-800">
            {{ t(command.platformLabelKey) }}
          </p>
          <CommandCard :command="command" />
        </div>
      </div>
    </div>

    <div class="mt-4">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-blue-800">
        {{ t('settings.components.settings.DockerNodeStartGuideCard.directStepTitle') }}
      </h4>
      <p class="mt-1 text-xs text-blue-900">
        {{ t('settings.components.settings.DockerNodeStartGuideCard.directStepDescription') }}
      </p>
      <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CommandCard v-for="command in directCommands" :key="command.id" :command="command" />
      </div>
    </div>

    <p class="mt-4 text-sm text-blue-900">
      {{ t('settings.components.settings.DockerNodeStartGuideCard.nextStep') }}
    </p>
    <p v-if="copyError" class="mt-2 text-xs text-red-700" data-testid="docker-launcher-copy-error">
      {{ copyError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import {
  buildDockerNodeLauncherCommands,
  type DockerLauncherCommand,
} from '~/utils/dockerNodeLauncherCommands';

const { t } = useLocalization();
const commands = buildDockerNodeLauncherCommands();
const copiedCommandId = ref<string | null>(null);
const copyError = ref<string | null>(null);
let resetCopiedTimer: ReturnType<typeof setTimeout> | null = null;

const installCommands = computed(() => commands.filter((command) => command.phase === 'install' && command.isPrimary));
const directCommands = computed(() => commands.filter((command) => command.phase === 'direct' && command.isPrimary));

function copyButtonLabel(commandId: string): string {
  if (copiedCommandId.value === commandId) {
    return t('settings.components.settings.DockerNodeStartGuideCard.copied');
  }
  return t('settings.components.settings.DockerNodeStartGuideCard.copy');
}

async function copyCommand(commandId: string, command: string): Promise<void> {
  copyError.value = null;
  try {
    await navigator.clipboard.writeText(command);
    copiedCommandId.value = commandId;
    if (resetCopiedTimer) {
      clearTimeout(resetCopiedTimer);
    }
    resetCopiedTimer = setTimeout(() => {
      copiedCommandId.value = null;
      resetCopiedTimer = null;
    }, 2000);
  } catch (error) {
    copyError.value = t('settings.components.settings.DockerNodeStartGuideCard.copyFailed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const CommandCard = defineComponent({
  name: 'DockerLauncherCommandCard',
  props: {
    command: {
      type: Object as () => DockerLauncherCommand,
      required: true,
    },
  },
  setup(props) {
    return () => h(
      'div',
      {
        class: 'rounded-md border border-gray-200 bg-white p-3',
        'data-testid': `docker-launcher-command-${props.command.id}`,
      },
      [
        h('div', { class: 'flex items-start justify-between gap-3' }, [
          h('div', [
            h('p', { class: 'text-sm font-medium text-gray-900' }, t(props.command.titleKey)),
            h('p', { class: 'mt-1 text-xs text-gray-500' }, t(props.command.descriptionKey)),
          ]),
          h(
            'button',
            {
              type: 'button',
              class: 'rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50',
              'data-testid': `copy-docker-launcher-command-${props.command.id}`,
              'aria-label': t('settings.components.settings.DockerNodeStartGuideCard.copyCommandAria', {
                command: t(props.command.titleKey),
              }),
              onClick: () => copyCommand(props.command.id, props.command.command),
            },
            copyButtonLabel(props.command.id),
          ),
        ]),
        h('pre', { class: 'mt-3 overflow-x-auto rounded bg-gray-950 p-3 text-xs text-gray-50' }, [
          h('code', props.command.command),
        ]),
      ],
    );
  },
});
</script>
