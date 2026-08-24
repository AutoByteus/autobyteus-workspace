import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '.nuxt/**', '.output/**', 'node_modules/**', 'evidence/**',
      'assets/**', 'components/**', 'composables/**', 'display/**', 'generated/**',
      'graphql/**', 'layouts/**', 'localization/**', 'middleware/**', 'pages/**',
      'public/**', 'services/**', 'shared/**', 'stores/**', 'types/**', 'utils/**',
      'vendor/**', 'workers/**', 'app.vue', 'error.vue', 'nuxt.config.ts',
    ],
  },
  {
    ...eslint.configs.recommended,
    files: ['prototype/scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['plugins/**/*.ts', 'prototype/tests/**/*.ts'],
    languageOptions: { ...config.languageOptions, globals: { ...globals.browser, ...globals.node } },
  })),
  {
    files: ['plugins/**/*.ts', 'prototype/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
