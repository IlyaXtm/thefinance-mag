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

  async function handleSubmit(event: React.FormEvent) {
    /*
      A real <form> rather than a button with a click handler: without one,
      pressing Enter in the email field does nothing, which is how most people
      submit a single-field form.
    */
    event.preventDefault();

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
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className="scroll-mt-24 rounded-card border border-border-subtle p-[22px]"
      /* The one gradient in the system. It marks the single conversion surface
         on the page without introducing a second accent colour. */
      style={{
        background: 'linear-gradient(160deg, rgba(77,154,254,.16), rgba(77,154,254,.02))',
      }}
    >
      <h2 id="newsletter-heading" className="text-[17px] font-bold text-text-primary">
        خبرنامه‌ی هفتگی
      </h2>
      <p className="mt-2 text-[14px] font-light leading-[1.85] text-text-secondary">
        هفته‌ای یک ایمیل، خلاصه‌ی بازار با منبع هر عدد. بدون سیگنال، بدون تبلیغ.
      </p>

      {state === 'done' ? (
        <p role="status" className="mt-4 text-[13px] font-medium text-accent">
          ثبت شد؛ ایمیل تأیید برایتان ارسال شد.
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-2.5">
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
              className="h-[46px] rounded-lg border bg-surface px-3.5 text-[14px] text-text-primary placeholder:text-text-muted"
              style={{ borderColor: error ? 'var(--danger)' : 'var(--border-interactive)' }}
            />
            <button
              type="submit"
              disabled={state === 'sending'}
              className="h-[46px] rounded-lg bg-accent text-[14.5px] font-medium text-accent-contrast transition-[filter,opacity] hover:brightness-110 disabled:opacity-60 motion-reduce:transition-none"
            >
              {state === 'sending' ? '…' : 'عضویت'}
            </button>
          </form>

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

          <p className="mt-3 text-[12.5px] leading-[1.7] text-text-muted">
            هر زمان بخواهید می‌توانید لغو عضویت کنید.
          </p>
        </>
      )}
    </section>
  );
}
