/**
 * ═══════════════════════════════════════════════════════════════════════
 *  THE NEWSLETTER FORM IS OFF. DO NOT FLIP THIS WITHOUT READING THIS FILE.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * `NewsletterCta`'s submit handler did not send anything anywhere. It waited
 * 400ms and showed «ثبت شد؛ ایمیل تأیید برایتان ارسال شد» — a confirmation
 * that a confirmation email was sent, when no request was made and no address
 * was stored. That was live on production. Every reader who typed an address
 * believed they had subscribed; the address went nowhere; and the line above
 * the field promises «هفته‌ای یک ایمیل», a commitment with nothing behind it.
 *
 * On a publication whose position is «بدون سیگنال، بدون تبلیغ» — whose whole
 * claim is that it does not overpromise — that is the worst available place
 * for an empty promise.
 *
 * NOT A "COMING SOON" MESSAGE. That keeps the field on screen and invites the
 * same input, so the reader still types an address and still gets nothing. The
 * card is not rendered and the header's two CTAs go with it.
 *
 * ── What actually has to happen first ──────────────────────────────────
 *
 * The blocker is NOT the frontend and it is not the endpoint. It is two DNS
 * records: SPF and DMARC on `thefinance.ir`. Without them the confirmation
 * email lands in spam, the double opt-in never completes, and the funnel dies
 * at its first step — so wiring the form to an endpoint that cannot deliver
 * would replace a fake success with a real silence.
 *
 * The backend is designed and recorded in the backlog: a `wp_tf_subscribers`
 * table, double opt-in, an unsubscribe token in every message, and a weekly
 * digest on `wp_schedule_event` rather than an email per publish. Roughly
 * three days of work once the DNS is in place.
 *
 * ── Turning it back on ─────────────────────────────────────────────────
 *
 * 1. SPF and DMARC published and verified on thefinance.ir.
 * 2. The endpoint exists and `handleSubmit` posts to it. The `setTimeout` in
 *    NewsletterCta.tsx MUST be gone BEFORE this flag is `true`, not after.
 * 3. Set this to `true`. Nothing else changes — the card and both header CTAs
 *    come back on their own.
 * 4. THE DESKTOP HEADER CTA CANNOT GO BACK AS `sm:inline-flex`. Measured
 *    2026-09-07: with that button present the header row needs 1136px and
 *    overflows horizontally from 1024 to 1135 — the band where the five-link
 *    nav has appeared but the row has not yet grown to hold it. It was doing
 *    that on production. `scripts/check-invariants.mjs` now checks 1024, so
 *    this fails loudly instead of being rediscovered.
 *
 * ── Why this constant is in a plain module and not in the component ────
 *
 * Because it was in the component first, and it did not work.
 * `NewsletterCta.tsx` is `'use client'`, and a server component importing a
 * value from a client module does not get the value — it gets a client
 * reference proxy, which is an object, which is truthy. So `NEWSLETTER_ENABLED
 * && <a/>` in the server-rendered header evaluated to TRUE with the flag set
 * to `false`, and both header CTAs kept rendering while the card they point at
 * was gone. Nothing errored; the build was clean; only the served HTML showed
 * it. A flag read across the client boundary is not a flag.
 *
 * Keep it here. This file has no `'use client'` and must not gain one.
 */
export const NEWSLETTER_ENABLED = false;
