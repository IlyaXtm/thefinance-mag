# Mag listing status

Last verified: 2026-08-19.

The first `v1` navy-dark listing slice is implemented as an RTL, server-rendered
Next.js page. It includes the page/search header, one featured story, three
secondary stories, URL-driven market filters, a responsive latest-article grid,
empty/error/loading states, Persian dates, fixed image aspect ratios, focus
styles, and reduced-motion handling.

## Data boundary

The page imports only `mag.service.ts`. With `NEXT_PUBLIC_USE_MOCK=true`, the
service returns isolated realistic fixtures. With the value set to `false`, the
same component tree consumes the tested WordPress GraphQL contract. The real
mode has been verified against the local Dockerized WordPress fixture.

Mock article images point at the current production uploads and are requested
through the Next.js image optimizer. Production article bodies are not copied
into source code.

## Intentionally deferred

- Article routes are the next slice; listing links already preserve the final
  `/mag/<slug>/` shape.
- Reports/monthlies stay hidden until their source is decided and at least three
  records exist.
- Newsletter subscription stays absent until a real endpoint and consent flow
  exist; the UI does not simulate a successful subscription.
- The CSS uses semantic `v1` variables, but their exact values remain
  provisional until the redesign token source is available.
- The current WordPress installation exposes IRANYekanX files, but they are not
  copied into this public repository until the font licence is confirmed.

## Verification performed

- Desktop viewport: 1440 × 1000
- Mobile viewport: 390 × 844
- No horizontal overflow at mobile width
- Featured image loads and is the priority image
- Market filter updates the URL and selected state
- Search preserves the selected market and filters results
- Mock and real local GraphQL modes both render
- TypeScript, ESLint, and production build pass
