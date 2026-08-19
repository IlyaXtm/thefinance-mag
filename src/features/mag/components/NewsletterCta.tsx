'use client';

import { useState } from 'react';

/**
 * Newsletter signup.
 *
 * EMAIL, not SMS. The content being sent is a weekly explanatory summary —
 * what happened in the markets and why — which fits an email and doesn't fit a
 * text message. More importantly, SMS is the medium of the signal channel:
 * collecting a phone number sets an expectation of alerts that this brand
 * can't and won't meet.
 *
 * COPY IS FIXED. Note what it deliberately does not say: no subscriber count,
 * no "exclusive signals", no "opportunities", no profit claim. The competitive
 * category leads with exactly those, and the entire brand position is that we
 * don't. Changing this copy is a brand decision, not a wording tweak.
 */
export function NewsletterCta() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function handleSubmit() {
    if (!EMAIL.test(email.trim())) {
      setError('ایمیل معتبر نیست. آدرس را بررسی کنید.');
      return;
    }

    setError(null);
    setState('sending');

    // TODO: wire to the subscription endpoint once the provider is chosen.
    await new Promise((r) => setTimeout(r, 400));
    setState('done');
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="rounded-card border border-border-subtle bg-surface-raised p-6"
    >
      <h2 id="newsletter-heading" className="text-[20px] font-bold text-text-primary">
        خلاصه هفتگی بازارها
      </h2>
      <p className="mt-2 text-text-secondary">
        هر هفته یک ایمیل: چه چیزی در بازارها اتفاق افتاد و چرا.
      </p>

      {state === 'done' ? (
        <p role="status" className="mt-4 font-semibold text-text-primary">
          عضو شدید
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 md:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              ایمیل شما
            </label>
            <input
              id="newsletter-email"
              type="email"
              inputMode="email"
              dir="ltr"
              placeholder="ایمیل شما"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'newsletter-error' : undefined}
              className="min-h-11 flex-1 rounded-full border bg-transparent px-4 text-[15px] text-text-primary placeholder:text-text-muted"
              style={{ borderColor: error ? 'var(--danger)' : 'var(--border-interactive)' }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={state === 'sending'}
              className="min-h-11 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-contrast transition-opacity disabled:opacity-60"
            >
              {state === 'sending' ? '…' : 'عضویت'}
            </button>
          </div>

          {error && (
            <p
              id="newsletter-error"
              role="alert"
              className="mt-2 text-[14px]"
              style={{ color: 'var(--danger)' }}
            >
              {error}
            </p>
          )}

          <p className="mt-3 text-[13px] text-text-muted">
            هر زمان بخواهید می‌توانید لغو عضویت کنید.
          </p>
        </>
      )}
    </section>
  );
}
