<template>
  <li class="px-4 py-3" :data-testid="`runtime-${id}`" :data-state="rowState">
    <div class="agent-runtime-grid">
      <h4 class="agent-runtime-line text-base font-semibold text-gray-900" :data-testid="`runtime-${id}-name`">{{ name }}</h4>

      <!-- installed -->
      <p class="agent-runtime-cell text-sm" :data-testid="`runtime-${id}-installed`">
        <span class="agent-runtime-label text-xs text-gray-400">{{ t('settings.agentRuntimes.columns.installed') }}</span>
        <span v-if="runtime.installed" class="agent-runtime-line text-gray-900"><span class="sr-only">{{ `${t('settings.agentRuntimes.version')} ` }}</span>{{ runtime.installedVersion }}</span>
        <span v-else class="agent-runtime-line text-gray-500" :data-testid="`runtime-${id}-not-installed`">{{ t('settings.agentRuntimes.notInstalled') }}</span>
      </p>

      <!-- updates -->
      <div class="agent-runtime-cell text-sm" :data-testid="`runtime-${id}-updates`">
        <span class="agent-runtime-label text-xs text-gray-400">{{ t('settings.agentRuntimes.columns.updates') }}</span>
        <div class="min-w-0">
          <template v-if="!runtime.installed">
            <a
              :href="runtime.installInstructionsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="agent-runtime-line w-fit gap-1 text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              :data-testid="`runtime-${id}-install-link`"
            >{{ t('settings.agentRuntimes.installInstructions') }}<Icon icon="heroicons:arrow-top-right-on-square-20-solid" class="h-4 w-4 flex-shrink-0" aria-hidden="true" /><span class="sr-only">{{ ` ${t('settings.agentRuntimes.opensInBrowser')}` }}</span></a>
            <p class="-mt-1 text-gray-500" :data-testid="`runtime-${id}-restart-hint`">{{ t('settings.agentRuntimes.restartHint') }}</p>
          </template>
          <p v-else-if="runtime.updates.state === 'CHECKING'" class="agent-runtime-line gap-2 text-gray-500" role="status" :data-testid="`runtime-${id}-status`">
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-hidden="true"></span>{{ t('settings.agentRuntimes.status.checking') }}
          </p>
          <p v-else-if="runtime.updates.state === 'UP_TO_DATE'" class="agent-runtime-line gap-1.5 text-green-700" :data-testid="`runtime-${id}-status`">
            <span class="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true"></span>{{ t('settings.agentRuntimes.status.upToDate') }}
          </p>
          <p v-else-if="runtime.updates.state === 'UPDATE_AVAILABLE'" class="agent-runtime-line gap-1.5 text-amber-700" :data-testid="`runtime-${id}-status`">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>{{ t('settings.agentRuntimes.status.updateAvailable', { version: runtime.updates.latestVersion ?? '' }) }}
          </p>
          <template v-else-if="runtime.updates.state === 'CHECK_FAILED'">
            <p class="agent-runtime-line gap-1.5 text-red-700" :data-testid="`runtime-${id}-status`">
              <span class="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden="true"></span>{{ t('settings.agentRuntimes.status.checkFailed') }}
            </p>
            <p class="-mt-1 text-gray-500" :data-testid="`runtime-${id}-check-failed-note`">{{ t('settings.agentRuntimes.status.checkFailedNote', { name }) }}</p>
          </template>
          <p v-if="canUpdateHere(nodeAccess) && blocked" :id="`runtime-${id}-blocked`" class="-mt-1 text-gray-500" :data-testid="`runtime-${id}-blocked`">
            {{ runtime.runningAgentCount === 1
              ? t('settings.agentRuntimes.update.blocked.one')
              : t('settings.agentRuntimes.update.blocked.other', { count: runtime.runningAgentCount }) }}
          </p>
        </div>
      </div>

      <!-- account -->
      <div class="agent-runtime-cell text-sm" :data-testid="`runtime-${id}-account`">
        <span class="agent-runtime-label text-xs text-gray-400">{{ t('settings.agentRuntimes.columns.account') }}</span>
        <div class="min-w-0">
          <span v-if="!runtime.installed || runtime.account.state === 'NOT_APPLICABLE'" class="agent-runtime-line text-gray-400" :data-testid="`runtime-${id}-signin`"><span aria-hidden="true">–</span><span class="sr-only">{{ t('settings.agentRuntimes.signIn.notApplicable') }}</span></span>
          <span v-else-if="runtime.account.state === 'CHECKING'" class="agent-runtime-line gap-2 text-gray-500" :data-testid="`runtime-${id}-signin`">
            <span class="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-hidden="true"></span>{{ t('settings.agentRuntimes.checking') }}
          </span>
          <span v-else-if="runtime.account.state === 'SIGNED_IN'" class="agent-runtime-line gap-1.5 text-gray-700" :data-testid="`runtime-${id}-signin`"><span class="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true"></span>{{ t('settings.agentRuntimes.signIn.signedIn') }}</span>
          <template v-else-if="runtime.account.state === 'SIGNED_OUT'">
            <span class="agent-runtime-line gap-1.5 text-amber-700" :data-testid="`runtime-${id}-signin`"><span class="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>{{ t('settings.agentRuntimes.signIn.notSignedIn') }}</span>
            <p v-if="canSignInHere(nodeAccess) && runtime.signInRoute === 'COMMAND_LINE'" class="-mt-1 text-gray-500" :data-testid="`runtime-${id}-signin-hint`">{{ ownNode ? t('settings.agentRuntimes.signIn.hint') : t('settings.agentRuntimes.signIn.hintOnNode') }}</p>
          </template>
          <span v-else class="agent-runtime-line text-gray-500" :data-testid="`runtime-${id}-signin`">{{ t('settings.agentRuntimes.signIn.unknown') }}</span>
        </div>
      </div>

      <!-- actions: Sign in where its browser can open, Update only on this computer's own node -->
      <div class="agent-runtime-actions" :data-testid="`runtime-${id}-actions`">
        <button
          v-if="canSignInHere(nodeAccess) && (signingIn || offersSignIn(runtime))"
          type="button"
          :class="[secondaryButton, signingIn ? 'cursor-wait' : '']"
          :disabled="signingIn || updating"
          :aria-label="`${signInLabel} ${name}`"
          :data-testid="`runtime-${id}-signin-button`"
          @click="emit('sign-in')"
        >
          <span v-if="signingIn" class="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-hidden="true"></span>{{ signInLabel }}
        </button>
        <template v-if="canUpdateHere(nodeAccess)">
          <button
            v-if="updating"
            type="button"
            :class="[primaryButton, 'cursor-wait opacity-70']"
            disabled
            :data-testid="`runtime-${id}-updating`"
          >
            <span class="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>{{ t('settings.agentRuntimes.update.updating') }}
          </button>
          <button
            v-else-if="offersUpdate(runtime)"
            type="button"
            :class="[primaryButton, blocked ? 'cursor-not-allowed opacity-50 hover:bg-gray-900' : '']"
            :aria-disabled="blocked ? 'true' : undefined"
            :aria-describedby="blocked ? `runtime-${id}-blocked` : undefined"
            :aria-label="`${updateLabel} ${name}`"
            :data-testid="`runtime-${id}-update`"
            @click="onUpdate"
          >{{ updateLabel }}</button>
        </template>
      </div>

      <!-- the runtime's own sign-in, finished in the browser -->
      <div v-if="canSignInHere(nodeAccess) && (signingIn || signInDidNotFinish)" class="agent-runtime-outcome" :data-testid="`runtime-${id}-signin-outcome`">
        <div v-if="signingIn" class="flex flex-wrap items-center gap-x-3 text-sm text-gray-600" role="status">
          <span :data-testid="`runtime-${id}-signin-waiting`">{{ ownNode ? t('settings.agentRuntimes.signIn.waiting', { name }) : t('settings.agentRuntimes.signIn.waitingOnNode', { name }) }}</span>
          <button type="button" class="rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :data-testid="`runtime-${id}-signin-cancel`" @click="emit('cancel-sign-in')">{{ t('settings.agentRuntimes.signIn.cancel') }}</button>
        </div>
        <p v-else class="text-sm text-red-700" role="alert" :data-testid="`runtime-${id}-signin-failed`">{{ t('settings.agentRuntimes.signIn.failed') }}</p>
      </div>

      <!-- progress and outcome of the runtime's own updater -->
      <div v-if="runtime.operation?.kind === 'UPDATE'" class="agent-runtime-outcome" :data-testid="`runtime-${id}-outcome`">
        <template v-if="updating">
          <div class="h-1.5 max-w-md overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-label="`${name}: ${t('settings.agentRuntimes.update.updating')}`">
            <div class="h-full w-1/3 animate-pulse rounded-full bg-blue-500"></div>
          </div>
          <p class="mt-1.5 break-words text-xs text-gray-500" :data-testid="`runtime-${id}-progress`"><span class="font-mono text-gray-700">{{ runtime.operation.command }}</span><template v-if="runtime.operation.step"> · {{ runtime.operation.step }}</template></p>
        </template>
        <p v-else-if="runtime.operation.state === 'SUCCEEDED'" class="text-sm text-green-700" :data-testid="`runtime-${id}-updated`">
          {{ t('settings.agentRuntimes.update.succeeded', { from: runtime.operation.fromVersion ?? '', to: runtime.operation.toVersion ?? '' }) }}
        </p>
        <div v-else-if="runtime.operation.state === 'FAILED'" role="alert" :data-testid="`runtime-${id}-update-failed`">
          <p class="text-sm text-red-700">{{ t('settings.agentRuntimes.update.failed', { version: runtime.operation.fromVersion ?? '' }) }}</p>
          <p class="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600" :data-testid="`runtime-${id}-update-error`">{{ runtime.operation.error }}</p>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { agentRuntimeName } from '@autobyteus/agent-presentation-contracts'
import type { AgentRuntime } from '~/types/agentRuntimes'
import {
  canSignInHere, canUpdateHere, isBlockedByAgents, isSigningIn, isUpdating, offersSignIn, offersUpdate,
  updateFailed, type AgentRuntimeNodeAccess,
} from './agentRuntimesPresentation'

const props = defineProps<{ runtime: AgentRuntime; nodeAccess: AgentRuntimeNodeAccess }>()
const emit = defineEmits<{ (event: 'update'): void; (event: 'sign-in'): void; (event: 'cancel-sign-in'): void }>()
const { t } = useLocalization()

const secondaryButton = 'inline-flex min-h-9 items-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'
const primaryButton = 'inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'

const id = computed(() => props.runtime.runtimeKind)
const name = computed(() => agentRuntimeName(props.runtime.runtimeKind))
/** On a remote node the copy says where sign-in happens: on that node. */
const ownNode = computed(() => props.nodeAccess === 'own')
const updating = computed(() => isUpdating(props.runtime))
const signingIn = computed(() => isSigningIn(props.runtime))
const blocked = computed(() => isBlockedByAgents(props.runtime))
const signInDidNotFinish = computed(() =>
  props.runtime.operation?.kind === 'SIGN_IN' && props.runtime.operation.state === 'DID_NOT_FINISH')
const updateLabel = computed(() =>
  updateFailed(props.runtime) ? t('settings.agentRuntimes.update.retry') : t('settings.agentRuntimes.update.action'))
const signInLabel = computed(() => {
  if (signingIn.value) return t('settings.agentRuntimes.signIn.signingIn')
  return signInDidNotFinish.value ? t('settings.agentRuntimes.update.retry') : t('settings.agentRuntimes.signIn.action')
})
const rowState = computed(() => {
  if (!props.runtime.installed) return 'not_installed'
  const operation = props.runtime.operation
  if (operation) return `${operation.kind.toLowerCase()}_${operation.state.toLowerCase()}`
  return props.runtime.updates.state.toLowerCase()
})

// A blocked Update stays focusable and announces its reason, but does nothing.
const onUpdate = () => { if (!blocked.value) emit('update') }
</script>

<style scoped>
/*
 * Stacked rows with visible labels by default; the five-column table once the list (the `agent-runtimes` container in
 * AgentRuntimesManager.vue) is wide enough for it. The list's own width decides, not the viewport, because the
 * Settings menu takes part of the window.
 */
.agent-runtime-grid { display: flex; flex-direction: column; row-gap: 0.5rem; }
.agent-runtime-cell { display: flex; gap: 0.5rem; }
.agent-runtime-label { width: 5rem; flex-shrink: 0; }
.agent-runtime-line { display: flex; align-items: center; }
.agent-runtime-actions { display: flex; flex-direction: column; gap: 0.5rem; }

@container agent-runtimes (min-width: 58rem) {
  .agent-runtime-grid {
    display: grid;
    grid-template-columns: 8rem 9rem minmax(0, 1fr) 15rem 8rem;
    column-gap: 1.5rem;
    align-items: start;
  }
  .agent-runtime-cell { display: block; }
  /* Each value keeps its label for screen readers; the header row shows it visually. */
  .agent-runtime-label {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;
  }
  .agent-runtime-line { min-height: 2.25rem; }
  .agent-runtime-actions { align-items: flex-end; justify-self: end; }
  .agent-runtime-outcome { grid-column: 3 / span 3; }
}
</style>
