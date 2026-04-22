import type { NuxtConfig } from '@nuxt/schema'

const mergeElectronConfig = (baseConfig: NuxtConfig, electronConfig: NuxtConfig): NuxtConfig => ({
  ...baseConfig,
  ...electronConfig,
  modules: electronConfig.modules ?? baseConfig.modules,
  electron: electronConfig.electron ?? baseConfig.electron,
  app: {
    ...(baseConfig.app || {}),
    ...(electronConfig.app || {}),
  },
  nitro: {
    ...(baseConfig.nitro || {}),
    ...(electronConfig.nitro || {}),
    output: {
      ...((baseConfig.nitro && 'output' in baseConfig.nitro ? baseConfig.nitro.output : {}) || {}),
      ...((electronConfig.nitro && 'output' in electronConfig.nitro ? electronConfig.nitro.output : {}) || {}),
    },
  },
  vite: {
    ...(baseConfig.vite || {}),
    ...(electronConfig.vite || {}),
    build: {
      ...((baseConfig.vite && typeof baseConfig.vite === 'object' && 'build' in baseConfig.vite ? baseConfig.vite.build : {}) || {}),
      ...((electronConfig.vite && typeof electronConfig.vite === 'object' && 'build' in electronConfig.vite ? electronConfig.vite.build : {}) || {}),
      rollupOptions: {
        ...(((baseConfig.vite && typeof baseConfig.vite === 'object' && 'build' in baseConfig.vite && baseConfig.vite.build && 'rollupOptions' in baseConfig.vite.build)
          ? baseConfig.vite.build.rollupOptions
          : {}) || {}),
        ...(((electronConfig.vite && typeof electronConfig.vite === 'object' && 'build' in electronConfig.vite && electronConfig.vite.build && 'rollupOptions' in electronConfig.vite.build)
          ? electronConfig.vite.build.rollupOptions
          : {}) || {}),
        output: {
          ...((((baseConfig.vite && typeof baseConfig.vite === 'object' && 'build' in baseConfig.vite && baseConfig.vite.build && 'rollupOptions' in baseConfig.vite.build && baseConfig.vite.build.rollupOptions && 'output' in baseConfig.vite.build.rollupOptions)
            ? baseConfig.vite.build.rollupOptions.output
            : {}) as Record<string, unknown>) || {}),
          ...((((electronConfig.vite && typeof electronConfig.vite === 'object' && 'build' in electronConfig.vite && electronConfig.vite.build && 'rollupOptions' in electronConfig.vite.build && electronConfig.vite.build.rollupOptions && 'output' in electronConfig.vite.build.rollupOptions)
            ? electronConfig.vite.build.rollupOptions.output
            : {}) as Record<string, unknown>) || {}),
        },
      },
    },
  },
})

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
      // Keep bundled assets under renderer-local _nuxt directory so file:// loads work.
      buildAssetsDir: '_nuxt/',
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
            assetFileNames: '_nuxt/[name].[hash][extname]',
            chunkFileNames: '_nuxt/[name].[hash].js',
            entryFileNames: '_nuxt/[name].[hash].js',
          }
        }
      },
    }
  }

  // Merge configurations with electron config taking precedence
  return mergeElectronConfig(baseConfig, electronConfig)
}
