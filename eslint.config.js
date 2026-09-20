import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' }],
      // Los catch vacios son deliberados: si algo secundario falla (analytics,
      // push, storage), la app sigue. No queremos ruido por eso.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Las funciones de /api corren en Node (Vercel), no en el navegador:
    // process y Buffer existen ahi.
    files: ['api/**/*.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
  },
  {
    // Los service workers de /public corren en su propio scope:
    // importScripts, clients y self no son globals de navegador.
    files: ['public/**/*.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
      sourceType: 'script',
    },
  },
])
