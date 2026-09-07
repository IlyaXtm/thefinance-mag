# مجله فایننس — Logo assets

Built from the official `the-finance-main-nav.svg`. The mark and the "FINANCE" / "فایننس"
wordmark are the **original paths, unmodified**. Only the word «مجله» was added.

## Files

| File | Use |
|---|---|
| `mag-lockup-b.svg` | **Primary.** One-line wordmark «مجله فایننس» + FINANCE + mark. Dark bg. 243×56 |
| `mag-lockup-b-light.svg` | Same, light bg |
| `mag-lockup-a.svg` | Alt: official logo untouched + rule + «مجله». Dark bg. 292×56 |
| `mag-lockup-a-light.svg` | Same, light bg |
| `mag-lockup-c.svg` | Fallback: whole wordmark set in Vazirmatn (use only if brand font is unavailable) |
| `mag-mark-official.svg` | Mark only, 64×56 |
| `mag-mark-official-ink.svg` | Mark only, light bg |
| `mag-favicon-official.svg` | 64×64 rounded tile |
| `finance-nav-clean.svg` | Reference: official parent logo, metadata stripped |

## ⚠ Font dependency

«مجله» is live `<text>` — **Vazirmatn Light (300)**, `font-size: 18`, baseline `y=45`
(matched to the official wordmark). Everything else is outlined paths.

Consequences:

- Inline the SVG in HTML → the page's Vazirmatn applies. **Recommended.**
- Load via `<img src>` or CSS `background` → external `@import` is blocked by browsers;
  it falls back to a system font. Use inline, or outline the text first.
- Before shipping print/official assets, convert «مجله» to outlines.

Load Vazirmatn:

```html
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400&display=swap" rel="stylesheet">
```

## Colors (from the official mark)

```
#0163E1  deep blue     (lowest bar)
#10A5F5  mid blue      (middle bar)
#00DBFF  cyan          (top bar)
#FFFFFF  frame + type  (dark bg)
#0B1120  frame + type  (light bg)
```

## Rules

- Minimum clear space around the lockup = height of the mark's chevron stroke.
- Below 24px height, use `mag-mark-official.svg` alone.
- Never rotate, recolor, or restretch the mark. The kashida in «فایننس» is part of the artwork.
- On photos or busy backgrounds, place the lockup on a solid `#05070E` plate.

## Header snippet

```html
<a href="/" aria-label="مجله فایننس">
  <!-- paste contents of mag-lockup-b.svg here, drop the width/height attrs -->
  <svg viewBox="0 0 243 56" style="height:34px;width:auto" …>…</svg>
</a>
```

---

## How this repo uses the pack — read before changing anything above

**Source of truth, not served assets.** Nothing in this directory is shipped to
the browser. `src/shared/ui/MagLogo.tsx` is `mag-lockup-b.svg` inlined as JSX;
`src/app/icon.svg` is `mag-favicon-official.svg`. These files stay so the
"never rotate, recolor or restretch" rule has an original to check against.

**The C2PA metadata block was stripped** from every file here. It was ~8KB of
base64 per SVG — more than the artwork in most of them — and it is provenance
for the generator, not for the mark.

**One lockup, not two.** `mag-lockup-b-light.svg` is kept for reference only.
The shipped component paints the ink with `currentColor`, so a single asset
serves `v1 navy dark`, `v2 dark` and `v2 light`. The header cannot choose
between two files anyway: the theme is applied pre-paint from localStorage and
the server does not know it.

**The three blues stay literal.** #0163E1 · #10A5F5 · #00DBFF are the mark. They
must read identically on all three themes, which is the same reason the
`--scrim-*` and `--on-media` tokens do not flip.

## ⚠ The font instruction above is NOT followed, deliberately

«مجله» is live `<text>`, and this README specifies **Vazirmatn Light** plus a
`fonts.googleapis.com` stylesheet. Both are refused, and neither is close:

- **The typeface is IRANYekanX**, product-wide, per `CLAUDE.md`. Blog v4 shipped
  Vazirmatn and it was REVERTED for exactly this reason — see
  `docs/changelog.md`, 2026-08-29. A second face in the logo alone rebuilds the
  visual detachment this project exists to remove.
- **No Google Fonts and no foreign CDN.** The server is in Iran behind
  ArvanCloud. A `fonts.googleapis.com` request is a blocking third-party request
  on a route where `CLAUDE.md` allows none, and it is unreliable from Iran.

So the component sets `font-family: inherit` and «مجله» renders in the page's
IRANYekanX at weight 300 — a real instance, since the face is loaded as a
variable font spanning 100–1000, not a synthesised light.

If the word ever has to be metrically identical to the drawing, outline «مجله»
**in IRANYekanX** and paste the paths into the component. Do not load a second
face, and do not add the `<link>` above.
