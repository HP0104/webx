import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist/**',
    'node_modules/**',
    'scratch/**',
    'scratch*.*',
    'tools/**',
    'scripts/**',
    '*.py',
    'cf_worker.js',
    'cloudflare_worker.js',
    'check_live.js',
    'check_tx.js',
    'fm_app.js',
    'translate*.mjs',
    'telegram_*.py'
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React$)' }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
])
