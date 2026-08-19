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
        // 700px measures 70–73 characters in Persian — mid-range of 65–75.
        prose: '700px',
      },
    },
  },
  plugins: [],
};

export default config;
