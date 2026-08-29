import type { Config } from 'tailwindcss';

/**
 * Tailwind consumes the semantic tokens from src/styles/tokens.css.
 *
 * It must NOT introduce a parallel palette. There is no `colors` extension
 * beyond these role mappings, and arbitrary colour values in class names are a
 * review failure — that is exactly how "the blog doesn't match the site"
 * happens a second time.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'border-interactive': 'var(--border-interactive)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-contrast': 'var(--accent-contrast)',
        'accent-soft': 'var(--accent-soft)',
        'focus-ring': 'var(--focus-ring)',
        danger: 'var(--danger)',
        skeleton: 'var(--skeleton)',
        'skeleton-strong': 'var(--skeleton-strong)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      gap: {
        grid: 'var(--gap-grid)',
        'grid-mobile': 'var(--gap-grid-mobile)',
      },
      fontFamily: {
        // The variable set by next/font in layout.tsx.
        sans: [
          'var(--font-fa)',
          'var(--font-latin)',
          'IRANYekanX',
          'Tahoma',
          'system-ui',
          'sans-serif',
        ],
      },
      lineHeight: {
        // Persian needs more than Latin defaults.
        body: '1.9',
        heading: '1.5',
        caption: '1.7',
      },
      fontSize: {
        'body-mobile': '17px',
        body: '18px',
      },
      maxWidth: {
        /*
         * The reading measure, RECALIBRATED FOR VAZIRMATN.
         *
         * This was 700px, which measured 70–73 Persian characters in
         * IRANYekanX. Vazirmatn is a narrower face, and at 700px the same
         * column measured 89 characters per line — counted directly off the
         * rendered text with Range geometry, not estimated. That is well past
         * the comfortable 65–75 and the line becomes hard to track back.
         *
         * 570px brings it to ~72. The typographic target did not change; the
         * typeface did, and the pixel value is downstream of both.
         */
        prose: '570px',
      },
    },
  },
  plugins: [],
};

export default config;
