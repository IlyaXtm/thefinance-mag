import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/**
 * ESLint.
 *
 * `next.config.ts` has always set `eslint: { ignoreDuringBuilds: false }`, but
 * no config file existed — so `next lint` dropped into its interactive setup
 * prompt and the gate never actually ran. This file is what makes that setting
 * mean something.
 *
 * `core-web-vitals` rather than `core-web-vitals` + `typescript` alone: SEO and
 * Core Web Vitals are this product's first priority, and the rules that catch
 * a raw <img> on the LCP path or a missing `alt` are exactly the ones worth
 * failing a build over.
 */
const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      /*
       * The article body is WordPress HTML rendered with
       * dangerouslySetInnerHTML, sanitised on the way in by
       * `sanitizeArticleHtml`. The rule can't see that, and there is no
       * alternative that keeps Gutenberg's markup.
       */
      '@next/next/no-html-link-for-pages': 'off',

      /* A leading underscore is the codebase's existing marker for a
         deliberately unused parameter — `submitComment(_submission)` has to
         keep the argument to match the real API's signature. Honour the
         convention rather than renaming to satisfy the default. */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
];

export default config;
