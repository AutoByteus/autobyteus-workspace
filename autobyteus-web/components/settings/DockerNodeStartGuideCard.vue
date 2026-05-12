<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="docker-node-start-guide-card">
    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
          {{ t('settings.components.settings.DockerNodeStartGuideCard.eyebrow') }}
        </p>
        <h3 class="mt-1 text-base font-semibold text-slate-950">
          {{ t('settings.components.settings.DockerNodeStartGuideCard.title') }}
        </h3>
        <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {{ t('settings.components.settings.DockerNodeStartGuideCard.description') }}
        </p>
      </div>
    </div>

    <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
        {{ t('settings.components.settings.DockerNodeStartGuideCard.installStepTitle') }}
      </h4>
      <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div
          v-for="command in installCommands"
          :key="command.id"
          class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            {{ t(command.platformLabelKey) }}
          </p>
          <CommandCard :command="command" />
        </div>
      </div>
    </div>

    <div class="mt-5">
      <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
        {{ t('settings.components.settings.DockerNodeStartGuideCard.directStepTitle') }}
      </h4>
      <p class="mt-1 text-sm leading-6 text-slate-600">
        {{ t('settings.components.settings.DockerNodeStartGuideCard.directStepDescription') }}
      </p>
      <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        <CommandCard v-for="command in directCommands" :key="command.id" :command="command" />
      </div>
    </div>

    <p class="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
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
        class: 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md',
        'data-testid': `docker-launcher-command-${props.command.id}`,
      },
      [
        h('div', { class: 'flex items-start justify-between gap-3' }, [
          h('div', [
            h('p', { class: 'text-sm font-semibold text-slate-900' }, t(props.command.titleKey)),
            h('p', { class: 'mt-1 text-xs leading-5 text-slate-500' }, t(props.command.descriptionKey)),
          ]),
          h(
            'button',
            {
              type: 'button',
              class: 'shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100',
              'data-testid': `copy-docker-launcher-command-${props.command.id}`,
              'aria-label': t('settings.components.settings.DockerNodeStartGuideCard.copyCommandAria', {
                command: t(props.command.titleKey),
              }),
              onClick: () => copyCommand(props.command.id, props.command.command),
            },
            copyButtonLabel(props.command.id),
          ),
        ]),
        h('pre', { class: 'mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-700 shadow-inner' }, [
          h('code', props.command.command),
        ]),
      ],
    );
  },
});
</script>
