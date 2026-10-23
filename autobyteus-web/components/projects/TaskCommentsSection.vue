<template>
  <!-- A Project Task's comment thread (task-comments): every comment oldest first with its number, time and full text, then
       one text box to add a comment. Comments are only added. Same card look as Parts and Dependencies; compact in the tab. -->
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" :class="compact ? '' : 'mt-4'" :aria-labelledby="headingId" data-testid="task-comments">
    <div :class="compact ? 'p-4' : 'p-5 sm:p-6'">
      <h2 :id="headingId" class="text-xs font-medium text-slate-500">{{ t('projects.comments.title') }}</h2>
      <p v-if="!task.comments.length" class="mt-2 text-sm text-slate-400" data-testid="task-comments-none">{{ t('projects.comments.none') }}</p>
      <ol v-else class="mt-2 max-w-[80ch] space-y-3">
        <li v-for="comment in task.comments" :key="comment.id" :data-testid="`task-comment-${comment.id}`">
          <p class="text-xs text-slate-500" data-testid="task-comment-meta">
            <span class="font-medium text-slate-600">#{{ comment.id }}</span>
            <span class="text-slate-400"> · </span>
            <time :datetime="comment.createdAt" :title="fullLocalTime(comment.createdAt, locale)">{{ shortRelativeTime(comment.createdAt, locale) }}</time>
          </p>
          <p class="mt-0.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800" data-testid="task-comment-text">{{ comment.text }}</p>
        </li>
      </ol>
      <form class="mt-4 max-w-[80ch]" data-testid="task-comment-form" @submit.prevent="add">
        <textarea
          :id="inputId"
          ref="input"
          v-model="text"
          rows="3"
          :disabled="saving"
          :aria-label="t('projects.comments.placeholder')"
          :aria-describedby="error ? errorId : undefined"
          :placeholder="t('projects.comments.placeholder')"
          class="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          data-testid="task-comment-input"
        />
        <p v-if="error" :id="errorId" role="alert" class="mt-2 text-sm text-red-700" data-testid="task-comment-error">{{ error }}</p>
        <div class="mt-2 flex justify-end">
          <button
            type="submit"
            :disabled="saving || !text.trim()"
            class="inline-flex min-h-9 items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="task-comment-add"
          >{{ t(saving ? 'projects.comments.adding' : 'projects.comments.add') }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask } from '~/types/project'
import { fullLocalTime, shortRelativeTime } from '~/utils/notificationTime'

/** `compact`: the right panel's Projects tab (smaller padding); both places can add a comment (REQ-006). */
const props = withDefaults(defineProps<{ task: ProjectTask; compact?: boolean }>(), { compact: false })
const { t, resolvedLocale } = useLocalization()
const store = useProjectTaskStore()
const locale = computed(() => String(resolvedLocale.value || 'en'))
const uid = Math.random().toString(36).slice(2, 8)
const headingId = `task-comments-${uid}`, inputId = `task-comment-input-${uid}`, errorId = `task-comment-error-${uid}`
const input = ref<HTMLTextAreaElement | null>(null)
const text = ref(''), saving = ref(false), error = ref('')
let alive = true
onBeforeUnmount(() => { alive = false })

/** Posts the text as one new comment; on success the box clears and keeps focus, on failure the text stays with the error. */
const add = async () => {
  const value = text.value.trim()
  if (!value || saving.value) return
  saving.value = true; error.value = ''
  try {
    await store.addComment(props.task.projectId, props.task.taskId, value, () => alive)
    if (alive) text.value = ''
  } catch (e) {
    if (alive) error.value = e instanceof Error ? e.message : t('projects.errors.requestFailed')
  } finally {
    if (alive) { saving.value = false; await nextTick(); input.value?.focus() }
  }
}
</script>
