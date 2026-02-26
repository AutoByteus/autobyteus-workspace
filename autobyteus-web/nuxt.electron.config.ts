import type { NuxtConfig } from '@nuxt/schema'
import { defu } from 'defu'

export function applyElectronConfig(baseConfig: NuxtConfig): NuxtConfig {
  // Return base config if not an electron build
  if (process.env.BUILD_TARGET !== 'electron') {
    return baseConfig
  }

  // Electron-specific configuration
  const electronConfig: NuxtConfig = {
    // Add electron module
    modules: [
      ...(baseConfig.modules || []),
      './modules/electron'
    ],

    // Configure electron build
    electron: {
      build: [
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist/electron',
              rollupOptions: {
                external: ['electron']
              }
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          vite: {
            build: {
              outDir: 'dist/electron',
              rollupOptions: {
                external: ['electron']
              }
            },
          },
        }
      ],
    },

    // Electron-specific app settings
    app: {
      baseURL: './',
      buildAssetsDir: '/',
    },

    // Electron-specific nitro settings
    nitro: {
      ...baseConfig.nitro,
      output: {
        dir: 'dist',
        publicDir: 'dist/renderer'
      },
    },

    // Electron-specific vite settings
    vite: {
      ...(baseConfig.vite || {}),
      base: './',
      build: {
        assetsDir: '_nuxt',
        rollupOptions: {
          output: {
            assetFileNames: '[name].[hash][extname]',
            chunkFileNames: '[name].[hash].js',
            entryFileNames: '[name].[hash].js',
          }
        }
      },
    }
  }

  // Merge configurations with electron config taking precedence
  return defu(electronConfig, baseConfig)
}