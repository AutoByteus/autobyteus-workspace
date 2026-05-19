<template>
  <section class="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6" data-testid="mobile-troubleshooting">
    <header class="mb-5 flex items-center gap-3">
      <button type="button" class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" @click="$emit('home')">
        Home
      </button>
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Connection</p>
        <h1 class="text-2xl font-bold text-slate-950">Troubleshoot connection</h1>
      </div>
    </header>
    <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
      <p class="text-sm text-slate-600">Current node</p>
      <p class="mt-1 break-all font-mono text-sm text-slate-900">{{ serverBaseUrl }}</p>
      <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" :disabled="isChecking" @click="$emit('checkStatus')">
        {{ isChecking ? 'Checking…' : 'Check status' }}
      </button>
      <div v-if="diagnostic" class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p class="font-semibold">{{ diagnostic.title }}</p>
        <p class="mt-1">{{ diagnostic.message }}</p>
        <p class="mt-1 text-xs">{{ diagnostic.recoveryAction }}</p>
      </div>
      <div v-else-if="status" class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Server reachable. Phone Access {{ status.phoneAccessEnabled ? 'enabled' : 'disabled' }}.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MobileConnectionDiagnostic, RemoteAccessStatus } from '~/types/remoteAccess';

defineProps<{
  serverBaseUrl: string;
  isChecking: boolean;
  diagnostic: MobileConnectionDiagnostic | null;
  status: RemoteAccessStatus | null;
}>();

defineEmits<{
  home: [];
  checkStatus: [];
}>();
</script>
