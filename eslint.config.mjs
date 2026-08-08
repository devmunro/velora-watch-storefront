import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['.astro/**', '.supabase/**', '.wrangler/**', 'coverage/**', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-recommended'],
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // The administration forms use valid nested label/control pairs, which this rule cannot resolve in Astro loops.
      'astro/jsx-a11y/label-has-associated-control': 'off',
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
