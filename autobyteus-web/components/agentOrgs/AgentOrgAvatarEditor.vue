<template>
  <div class="space-y-3" data-test="org-avatar-editor">
    <p class="text-sm font-semibold text-slate-900">{{ t('agentOrgs.avatar.label') }}</p>
    <div class="flex flex-wrap items-center gap-4">
      <AgentOrgAvatar :name="name" :avatar-url="modelValue" />
      <div class="space-y-2">
        <input ref="picker" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="sr-only" tabindex="-1" :disabled="disabled || pending" :aria-label="t('agentOrgs.avatar.upload')" @change="upload">
        <div class="flex gap-2">
          <button type="button" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="disabled || pending" @click="picker?.click()">{{ t('agentOrgs.avatar.upload') }}</button>
          <button v-if="modelValue" type="button" class="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" :disabled="disabled || pending" @click="remove">{{ t('agentOrgs.avatar.remove') }}</button>
        </div>
        <p class="text-xs text-slate-500">{{ t('agentOrgs.avatar.formats') }}</p>
      </div>
    </div>
    <p v-if="pending" class="text-sm text-slate-600" role="status">{{ t('agentOrgs.avatar.uploading') }}</p>
    <p v-if="error" class="text-sm text-red-700" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import AgentOrgAvatar from './AgentOrgAvatar.vue'
import { useFileUploadStore } from '~/stores/fileUploadStore'
import { useLocalization } from '~/composables/useLocalization'
const props = defineProps<{ modelValue: string; name: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; pending: [value: boolean] }>()
const { t } = useLocalization()
const uploadStore = useFileUploadStore()
const picker = ref<HTMLInputElement | null>(null)
const pending = ref(false)
const error = ref('')
let disposed = false
onBeforeUnmount(() => { disposed = true })
const remove = () => {
  if (props.disabled || pending.value) return
  error.value = ''; emit('update:modelValue', '')
}
const upload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || pending.value || props.disabled) return
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    error.value = t('agentOrgs.avatar.invalidType'); return
  }
  pending.value = true; error.value = ''; emit('pending', true)
  try {
    const url = await uploadStore.uploadFile(file)
    if (!url?.trim()) throw new Error(t('agentOrgs.avatar.uploadFailed'))
    if (!disposed) emit('update:modelValue', url)
  } catch (cause) {
    if (!disposed) error.value = cause instanceof Error ? cause.message : t('agentOrgs.avatar.uploadFailed')
  } finally {
    if (!disposed) { pending.value = false; emit('pending', false) }
  }
}
</script>
