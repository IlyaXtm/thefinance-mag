/**
 * The reader-facing theme choice.
 *
 * ONE SOURCE OF TRUTH, because this value is written by three things that
 * cannot see each other: a blocking script in <head>, a click handler in a
 * client component, and the CSS in tokens.css. If any two disagree the page
 * either flashes the wrong theme or renders a theme the tokens do not define.
 */

/** The brand default — v1 navy. Also what the server renders. */
export const THEME_DARK = 'v1';

/** The light theme. */
export const THEME_LIGHT = 'v2-light';

/**
 * Every value the attribute may hold.
 *
 * `v2-dark` is in the list but NOT reachable from the toggle: it is a design
 * variant for review, not a reader choice, and offering a reader two dark
 * themes that differ only in how neutral the black is would be a worse
 * control. It stays here so that setting it by hand — or restoring it from a
 * previous visit — is not treated as a corrupt value and discarded.
 */
export const THEMES = [THEME_DARK, 'v2-dark', THEME_LIGHT] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'tf-mag-theme';

/**
 * The pre-paint script, inlined into <head>.
 *
 * WHY IT MUST BE INLINE AND BLOCKING. The server has no way to know what the
 * reader picked last time — there is no cookie and this route is statically
 * rendered and cached — so the HTML always arrives as the dark default. A
 * reader who chose light would see a dark flash on every navigation if the
 * correction waited for React to hydrate. This runs before the first paint
 * instead, so there is nothing to see.
 *
 * It is allowed by the CSP: `script-src` already carries `'unsafe-inline'`
 * because Next's own bootstrap requires it. Removing that needs nonces via
 * middleware, and this script does not add the requirement.
 *
 * The stored value is CHECKED AGAINST THE ALLOW-LIST rather than trusted.
 * localStorage is writable by anything running on this origin, and writing an
 * arbitrary string into a DOM attribute is how an attribute-injection bug
 * starts. An unknown value is dropped and the default stands.
 *
 * Wrapped in try/catch because reading localStorage THROWS — not returns null
 * — in a browser set to block site data. An exception here would run before
 * anything else on the page.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEMES)}.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;
