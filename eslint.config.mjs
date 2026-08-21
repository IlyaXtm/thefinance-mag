import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

/**
 * ESLint config.
 *
 * This did not exist until now, which meant `ignoreDuringBuilds: false` in
 * next.config.ts was a no-op — a quality gate that had never once executed.
 *
 * The custom rules below encode constraints that were previously only written
 * in prose, and that a reviewer has to remember. A linter doesn't forget.
 */
export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  {
    rules: {
      /*
        Physical direction properties break RTL. Persian is the base direction
        here, so `left`/`right` are almost always a bug that only shows up to a
        Persian reader.
      */
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\b(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-/]",
          message:
            'Use logical properties (ms/me/ps/pe/start/end) — physical left/right breaks RTL.',
        },
        {
          selector: "Literal[value=/font-style:\\s*italic/]",
          message:
            'Persian faces have no true italic; browsers synthesise a broken slant. Use weight or colour.',
        },
        {
          selector: "Literal[value=/text-align:\\s*justify/]",
          message:
            'Justified Persian produces rivers of whitespace without kashida support.',
        },
      ],

      /* Browser storage is unsupported in this environment. */
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Browser storage is not supported here.' },
        { name: 'sessionStorage', message: 'Browser storage is not supported here.' },
      ],

      /*
        The feature API layer is the only place that talks to the network.
        A page or component calling fetch() directly bypasses the mock/real
        switch, so `NEXT_PUBLIC_USE_MOCK` silently stops working for it.
      */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mag.mock', '**/mag.comments.mock'],
              message:
                'Import from mag.service instead — it is the only source-switch point.',
            },
          ],
        },
      ],
    },
  },
  {
    /*
      The service files are the exception the rule exists to protect: they
      import both implementations precisely so nothing else has to. Anywhere
      else, a direct mock import means NEXT_PUBLIC_USE_MOCK silently stops
      working for that call site.
    */
    files: ['**/mag.service.ts', '**/mag.comments.service.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    /* Mocks intentionally accept parameters they don't use, to match the real
       signature exactly — that parity is what keeps the two in step. */
    files: ['**/*.mock.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
