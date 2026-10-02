import { computed, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
export function useProjectNotice(messages: Record<string, string>) {
  const route = useRoute(), router = useRouter()
  const message = computed(() => messages[String(route.query.notice ?? '')] ?? '')
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(() => [route.path, route.query.notice], () => {
    if (timer) clearTimeout(timer)
    if (!message.value) return
    const path = route.path, marker = route.query.notice
    timer = setTimeout(() => {
      if (route.path !== path || route.query.notice !== marker) return
      const {notice: _expired, ...query} = route.query
      void router.replace({path, query})
    }, 3000)
  }, {immediate: true})
  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
  return message
}
