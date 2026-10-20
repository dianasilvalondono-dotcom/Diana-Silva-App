import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/* no-unused-vars de ESLint no cuenta como uso aparecer en JSX (<Badge />).
   En vez de esconder todo nombre con mayúscula (lo que tapaba componentes y
   constantes muertas, salud-global-17), esta regla marca como usadas las
   variables que aparecen como etiqueta JSX. Es lo mismo que hace
   react/jsx-uses-vars, sin sumar una dependencia. */
const ronda = {
  rules: {
    'jsx-uses-vars': {
      meta: { type: 'problem', schema: [] },
      create(context) {
        return {
          JSXOpeningElement(node) {
            let nombre = node.name
            while (nombre.type === 'JSXMemberExpression') nombre = nombre.object
            if (nombre.type === 'JSXIdentifier') context.sourceCode.markVariableAsUsed(nombre.name, node)
          },
        }
      },
    },
  },
}

export default defineConfig([
  // .claude: copias de trabajo de otras sesiones, no son código de la app.
  globalIgnores(['dist', '.claude']),
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
    plugins: { ronda },
    rules: {
      'ronda/jsx-uses-vars': 'error',
      // Solo se ignora lo que empieza por guion bajo (a propósito sin usar).
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', caughtErrors: 'none' }],
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
