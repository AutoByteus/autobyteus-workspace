<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="phone-setup-guide-card">
    <div>
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
        {{ t('settings.components.settings.PhoneSetupGuideCard.eyebrow') }}
      </p>
      <h3 class="mt-1 text-base font-semibold text-slate-950">
        {{ t('settings.components.settings.PhoneSetupGuideCard.title') }}
      </h3>
      <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
        {{ t('settings.components.settings.PhoneSetupGuideCard.description') }}
      </p>
    </div>

    <div class="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
      <p class="font-semibold">{{ t('settings.components.settings.PhoneSetupGuideCard.targetUrlTitle') }}</p>
      <p class="mt-1">{{ t('settings.components.settings.PhoneSetupGuideCard.targetUrlDescription') }}</p>
      <code class="mt-2 block rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs text-blue-900">https://&lt;machine&gt;.&lt;tailnet&gt;.ts.net/mobile</code>
      <p class="mt-2 text-xs leading-5 text-blue-900" data-testid="phone-setup-magicdns-note">
        {{ t('settings.components.settings.PhoneSetupGuideCard.magicDnsGuidance') }}
      </p>
    </div>

    <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
        {{ t('settings.components.settings.PhoneSetupGuideCard.installStepTitle') }}
      </h4>
      <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <a
          v-for="link in installLinks"
          :key="link.id"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          :data-testid="`phone-setup-install-link-${link.id}`"
        >
          <p class="text-sm font-semibold text-slate-900">{{ t(link.platformLabelKey) }}</p>
          <p class="mt-1 text-xs leading-5 text-slate-500">{{ t(link.descriptionKey) }}</p>
        </a>
      </div>
      <p class="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900" data-testid="phone-setup-macos-cli-note">
        {{ t('settings.components.settings.PhoneSetupGuideCard.macosCliNote') }}
      </p>
    </div>

    <div class="mt-5">
      <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
        {{ t('settings.components.settings.PhoneSetupGuideCard.macosCommandsTitle') }}
      </h4>
      <p class="mt-1 text-sm leading-6 text-slate-600">
        {{ t('settings.components.settings.PhoneSetupGuideCard.macosCommandsDescription') }}
      </p>
      <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CommandCard v-for="command in macosCommands" :key="command.id" :command="command" />
      </div>
    </div>

    <p class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
      {{ t('settings.components.settings.PhoneSetupGuideCard.nextStep') }}
    </p>
    <p class="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
      {{ t('settings.components.settings.PhoneSetupGuideCard.funnelNote') }}
    </p>
    <p v-if="copyError" class="mt-2 text-xs text-red-700" data-testid="phone-setup-copy-error">
      {{ copyError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import {
  buildPhoneSetupGuideCommands,
  phoneSetupInstallLinks,
  type PhoneSetupGuideCommand,
} from '~/utils/phoneSetupGuideCommands';

const { t } = useLocalization();
const commands = buildPhoneSetupGuideCommands();
const installLinks = phoneSetupInstallLinks;
const copiedCommandId = ref<string | null>(null);
const copyError = ref<string | null>(null);
let resetCopiedTimer: ReturnType<typeof setTimeout> | null = null;

const macosCommands = computed(() => commands.filter((command) => command.phase === 'macos' && command.isPrimary));

function copyButtonLabel(commandId: string): string {
  if (copiedCommandId.value === commandId) {
    return t('settings.components.settings.PhoneSetupGuideCard.copied');
  }
  return t('settings.components.settings.PhoneSetupGuideCard.copy');
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
    copyError.value = t('settings.components.settings.PhoneSetupGuideCard.copyFailed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const CommandCard = defineComponent({
  name: 'PhoneSetupGuideCommandCard',
  props: {
    command: {
      type: Object as () => PhoneSetupGuideCommand,
      required: true,
    },
  },
  setup(props) {
    return () => h(
      'div',
      {
        class: 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md',
        'data-testid': `phone-setup-command-${props.command.id}`,
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
              'data-testid': `copy-phone-setup-command-${props.command.id}`,
              'aria-label': t('settings.components.settings.PhoneSetupGuideCard.copyCommandAria', {
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
