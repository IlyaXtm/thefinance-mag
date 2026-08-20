'use client';

import { useState } from 'react';

/**
 * Comment form.
 *
 * A client component because it needs state — but the comment LIST is a server
 * component, so the indexable content stays server-rendered and only the form
 * costs JavaScript.
 *
 * The moderation notice is shown BEFORE submitting, not only after. A reader
 * who posts and then sees nothing appear assumes it failed and posts again;
 * telling them upfront that comments are reviewed prevents that and sets an
 * honest expectation.
 *
 * Email is collected but never displayed. WordPress needs it for moderation.
 * The form says so explicitly — asking for an email without explaining why is
 * where people abandon a form.
 */

const MAX_LENGTH = 2000;

export function CommentForm({ articleId }: { articleId: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    /* A real form, so Enter submits and the browser's own validation and
       autofill behave the way people expect. */
    event.preventDefault();

    setError(null);
    setState('sending');

    try {
      const res = await fetch('/mag/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          authorName: name,
          authorEmail: email,
          content,
          parentId: null,
          website,
        }),
      });

      const data = (await res.json()) as { status?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'ارسال دیدگاه انجام نشد.');
        setState('idle');
        return;
      }

      setState('sent');
      setName('');
      setEmail('');
      setContent('');
    } catch {
      setError('ارسال دیدگاه انجام نشد. اتصال را بررسی کنید.');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="rounded-card border border-border-subtle bg-surface-raised p-5"
      >
        <p className="font-semibold text-text-primary">دیدگاه شما ثبت شد.</p>
        <p className="mt-2 text-[14px] leading-[1.8] text-text-secondary">
          پس از بررسی و تأیید نمایش داده می‌شود.
        </p>
      </div>
    );
  }

  const remaining = MAX_LENGTH - content.length;

  return (
    <section
      aria-labelledby="comment-form-heading"
      className="rounded-card border border-border-subtle bg-surface-raised p-5"
    >
      <h2 id="comment-form-heading" className="text-[18px] font-bold text-text-primary">
        دیدگاه شما
      </h2>
      <p className="mt-1 text-[13px] text-text-muted">
        دیدگاه‌ها پیش از انتشار بررسی می‌شوند. ایمیل شما نمایش داده نمی‌شود.
      </p>

      <form onSubmit={handleSubmit} noValidate>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="comment-name" className="mb-1.5 block text-[13px] text-text-secondary">
            نام
          </label>
          <input
            id="comment-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 w-full rounded-card border border-border-interactive bg-transparent px-3 text-[15px] text-text-primary"
          />
        </div>

        <div>
          <label htmlFor="comment-email" className="mb-1.5 block text-[13px] text-text-secondary">
            ایمیل
          </label>
          <input
            id="comment-email"
            type="email"
            inputMode="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full rounded-card border border-border-interactive bg-transparent px-3 text-[15px] text-text-primary"
          />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="comment-body" className="mb-1.5 block text-[13px] text-text-secondary">
          متن دیدگاه
        </label>
        <textarea
          id="comment-body"
          rows={5}
          maxLength={MAX_LENGTH}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-describedby="comment-count"
          className="w-full rounded-card border border-border-interactive bg-transparent p-3 text-[15px] leading-[1.9] text-text-primary"
        />
        <p id="comment-count" className="mt-1 text-[12px] text-text-muted">
          {remaining < 200 ? `${remaining} نویسه باقی مانده` : '\u00A0'}
        </p>
      </div>

      {/*
        Honeypot. Hidden from people, invisible to assistive tech, filled by
        bots. Server-side it results in a normal-looking success response — an
        error would just teach the bot to adapt.
      */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0">
        <label htmlFor="comment-website">وب‌سایت</label>
        <input
          id="comment-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[14px]" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-4 min-h-11 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-contrast transition-opacity disabled:opacity-60"
      >
        {state === 'sending' ? 'در حال ارسال…' : 'ارسال دیدگاه'}
      </button>
      </form>
    </section>
  );
}
