// eslint.config.mjs
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default defineConfig([
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      // Allow "any" as a warning to avoid breaking existing code paths
      '@typescript-eslint/no-explicit-any': 'error',
    },
    // Ignore generated artifacts
    ignores: ['node_modules/**', 'dist/**', 'build/**', '.medusa/**'],
  },
])
