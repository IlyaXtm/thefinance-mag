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
        /* Text over photography. Fixed across themes — see tokens.css. */
        'on-media': 'var(--on-media)',
        'on-media-secondary': 'var(--on-media-secondary)',
        'on-media-muted': 'var(--on-media-muted)',
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
        sans: ['var(--font-fa)', 'Tahoma', 'system-ui', 'sans-serif'],
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
         * 700px measures 70–73 characters in IRANYekanX — mid-range of 65–75.
         *
         * Blog v4 briefly cut this to 570px, because it had switched the face
         * to Vazirmatn, which is narrower: 700px measured 89 characters there,
         * counted off the rendered text with Range geometry. That measurement
         * was right and is not the reason this is back at 700 — the face is.
         * IRANYekanX is the product-wide typeface and the switch was reverted,
         * so the column that was calibrated for it comes back with it.
         *
         * The pair moves together. Never change one without re-measuring the
         * other.
         */
        prose: '700px',
      },
    },
  },
  plugins: [],
};

export default config;
