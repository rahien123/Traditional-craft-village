import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^(req|res|next|_)' }],
      'no-console': ['warn', { allow: ['error', 'warn', 'info', 'log'] }],
    },
  },
  {
    ignores: ['node_modules/**', 'uploads/**', 'prisma/migrations/**'],
  },
];
