import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineVitestConfig({
  test: {
    globals: true,
    environment: 'nuxt', // integrates Nuxt runtime, composables, and auto-imports
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom', // or 'jsdom'
      },
    },
    setupFiles: ['tests/setup/websocket.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'electron-dist/**',
      'resources/**',
      '**/resources/**',
      '**/server/tests/**',
      '**/.output/**',
    ],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './'), // Adjust this path if your project structure is different
    },
  },
})
