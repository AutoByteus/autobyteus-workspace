<template>
  <div class="fixed inset-0 z-50 flex items-end bg-slate-950/40" data-testid="mobile-unpair-confirm">
    <section class="w-full rounded-t-3xl bg-white p-5 shadow-2xl">
      <h2 class="text-xl font-bold text-slate-950">Unpair this phone?</h2>
      <p class="mt-2 text-sm text-slate-600">This removes only the local phone session. Use desktop Phone Access to revoke credentials for all devices.</p>
      <div class="mt-5 grid grid-cols-2 gap-3">
        <button type="button" class="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700" @click="$emit('cancel')">
          Cancel
        </button>
        <button type="button" class="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('confirm')">
          Unpair
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  cancel: [];
  confirm: [];
}>();
</script>
