import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: { react },
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
      // Count identifiers used only in JSX (e.g. `motion`, mapped `Icon`
      // components) as "used" so no-unused-vars stops false-flagging them.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // react-hooks v7 ships very aggressive rules; the codebase uses the
      // standard "fetch-in-effect then setState" pattern intentionally.
      // Keep them visible as warnings instead of hard errors.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Dev-only Fast Refresh granularity hint (shared style/hook exports live
      // beside components). Does not affect production builds.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
