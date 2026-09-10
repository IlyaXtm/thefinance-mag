import type { MetadataRoute } from 'next';
import { MAG_DESCRIPTION, MAG_NAME, magPath } from '@/features/mag/lib/site';

/**
 * The web app manifest — the Android/Chrome side of the favicon pack.
 *
 * ── Why this file exists ────────────────────────────────────────────────
 *
 * The pack ships `android-chrome-192x192.png` and `512x512.png`, and those are
 * inert without a manifest pointing at them: Android's home-screen and task
 * switcher read icons from here, not from `<link rel="icon">`. Without it the
 * two PNGs are two files nobody fetches.
 *
 * ── What was wrong with the pack's own site.webmanifest ─────────────────
 *
 *   "name": "",  "short_name": ""      — empty strings. Android falls back to
 *                                        the <title>, so the home-screen label
 *                                        would have been whatever page the
 *                                        reader happened to add.
 *   "src": "/favicon/android-…"        — absolute, and this app is served under
 *                                        basePath `/mag`. Every icon 404s.
 *   "theme_color": "#ffffff"           — the magazine's default theme is dark.
 *   "background_color": "#ffffff"
 *
 * So the values are written here, from the same constants the rest of the site
 * uses, rather than the generator's placeholders being committed.
 *
 * ── NO `display: standalone`, deliberately ──────────────────────────────
 *
 * The pack asks for it and it is left out. `standalone` is what makes Chrome
 * treat the magazine as an installable app and offer an install prompt — a new
 * product surface, with its own launch behaviour and its own decisions about
 * navigation chrome, none of which anyone has asked for. Omitting it defaults
 * to `browser`: the icons are correct if a reader adds the site to their home
 * screen themselves, and nothing prompts them to.
 *
 * Turning the magazine into an installable app is a product decision. This is
 * a favicon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: MAG_NAME,
    short_name: MAG_NAME,
    description: MAG_DESCRIPTION,
    /* `lang`/`dir` so the label renders as Persian RTL rather than being
       guessed from the string. */
    lang: 'fa',
    dir: 'rtl',
    start_url: magPath('/'),
    scope: magPath('/'),
    /* --surface in the v1 theme, which is the default the server renders. */
    theme_color: '#040c1f',
    background_color: '#040c1f',
    icons: [
      {
        src: magPath('/icons/android-chrome-192x192.png'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: magPath('/icons/android-chrome-512x512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        /*
          MASKABLE, and separate from the two above rather than doubling as
          them. Android crops a launcher icon to whatever shape the device
          uses — circle, squircle, teardrop — and only the inner 80% is
          guaranteed to survive. An `any` icon cropped that way loses the
          triangle's corners; this one carries the mark at 60% of the canvas
          inside a full-bleed plate, so the crop lands on empty white whatever
          shape it takes.
        */
        src: magPath('/icons/maskable-512x512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
