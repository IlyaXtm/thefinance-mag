import type { Comment, CommentThread } from '../types/mag-comments.types';
import { formatJalali, toDateTimeAttr, toPersianDigits } from '../lib/format';

/**
 * Approved comments.
 *
 * Server-rendered, so the text is in the HTML a crawler sees — moderated
 * comments are real content and count toward the page.
 *
 * Content arrives as plain text (the API strips WordPress's HTML) and is
 * rendered as text, never with dangerouslySetInnerHTML. Comments are the one
 * place an untrusted party writes into this site.
 *
 * `whiteSpace: pre-line` preserves the paragraph breaks a commenter typed
 * without allowing any markup.
 */

function CommentItem({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
  return (
    <li className={isReply ? 'border-inline-start ps-4' : ''} style={isReply ? { borderInlineStartWidth: 2, borderColor: 'var(--border-subtle)' } : undefined}>
      <article className="rounded-card border border-border-subtle bg-surface-raised p-4">
        <div className="flex items-center gap-3">
          {/*
            Initial-based avatar, not Gravatar. Gravatar is a third-party
            request per comment, leaks a hash of the commenter's email to a
            foreign service, and is unreliable from Iran.
          */}
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm text-text-muted"
          >
            {comment.authorName.trim().charAt(0)}
          </span>

          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">{comment.authorName}</p>
            <time
              dateTime={toDateTimeAttr(comment.createdAt)}
              className="text-[12px] text-text-muted"
            >
              {formatJalali(comment.createdAt)}
            </time>
          </div>
        </div>

        <p
          className="mt-3 text-[15px] leading-[1.9] text-text-secondary"
          style={{ whiteSpace: 'pre-line' }}
        >
          {comment.content}
        </p>
      </article>

      {comment.replies.length > 0 && (
        <ul className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CommentList({ thread }: { thread: CommentThread }) {
  /*
    No comments → the entire section is absent, including the heading.
    An empty «دیدگاه‌ها» heading over nothing reads as broken, and most
    articles will have zero comments for a long time.
  */
  if (thread.items.length === 0) return null;

  return (
    <section aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="mb-5 text-[22px] font-bold text-text-primary">
        دیدگاه‌ها
        <span className="ms-2 text-[15px] font-normal text-text-muted">
          {toPersianDigits(thread.total)}
        </span>
      </h2>

      <ul className="space-y-4">
        {thread.items.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </ul>
    </section>
  );
}
