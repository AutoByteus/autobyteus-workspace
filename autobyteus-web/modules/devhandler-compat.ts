import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'devhandler-compat'
  },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return
    const originalCallHook = nuxt.callHook.bind(nuxt)
    nuxt.callHook = ((name: string, ...args: unknown[]) => {
      if (name === 'server:devHandler' && args.length < 2) {
        args.push({ cors: () => false })
      }
      return originalCallHook(name, ...args)
    }) as typeof nuxt.callHook
  }
})
