import { useUiErrorStore } from '~/stores/uiErrorStore'

export default defineNuxtPlugin((nuxtApp) => {
  const store = useUiErrorStore()

  nuxtApp.hook('app:error', (error) => {
    store.push(error, 'nuxt')
  })

  if (nuxtApp.vueApp?.config) {
    const existingHandler = nuxtApp.vueApp.config.errorHandler
    nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
      store.push(
        {
          message: `Vue error: ${String(info || 'unknown')}`,
          error,
          component: instance?.$options?.name || instance?.$options?.__name
        },
        'vue'
      )
      if (existingHandler) {
        existingHandler(error, instance, info)
      }
    }
  }

  window.addEventListener('error', (event) => {
    store.push(event.error || event.message, 'window')
  })

  window.addEventListener('unhandledrejection', (event) => {
    store.push(event.reason, 'unhandledrejection')
  })

  if (import.meta.dev) {
    const originalError = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      try {
        if (args.length === 1) {
          store.push(args[0], 'console.error')
        } else {
          store.push({ message: 'console.error', args }, 'console.error')
        }
      } catch {
        // Ignore any issues in the error reporter itself.
      }
      originalError(...args)
    }
  }
})
