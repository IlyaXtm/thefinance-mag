/**
 * Comment types.
 *
 * Only APPROVED comments ever reach these types. Pending and spam comments
 * live in WordPress and are never fetched — the frontend has no concept of an
 * unapproved comment, which means there is no code path that could accidentally
 * render one.
 */

export interface Comment {
  id: string;
  /** Display name as submitted. Never an email or any other contact detail. */
  authorName: string;
  /**
   * Avatar URL, or null.
   *
   * Gravatar is NOT used: it is a third-party request per comment, it leaks a
   * hash of the commenter's email to a foreign service, and it is unreliable
   * from Iran. A local initial-based placeholder covers it.
   */
  avatarUrl: string | null;
  /** Plain text. Sanitised server-side; never rendered as HTML. */
  content: string;
  /** ISO 8601. */
  createdAt: string;
  /** Direct replies. One level deep — see CommentThread. */
  replies: Comment[];
}

/**
 * A thread is a flat list of top-level comments, each carrying its replies.
 *
 * Nesting is capped at ONE level deliberately. Deeper threads are unreadable
 * on mobile in RTL — each level costs inline padding, and by level three a
 * Persian comment column is too narrow to read. Replies to replies attach to
 * the same top-level parent.
 */
export interface CommentThread {
  items: Comment[];
  /** Total including replies. Used for the section heading and schema. */
  total: number;
}

export interface CommentSubmission {
  articleId: string;
  authorName: string;
  /** Never displayed. Stored by WordPress for moderation only. */
  authorEmail: string;
  content: string;
  /** Top-level when null. */
  parentId: string | null;
}

export type CommentSubmitResult =
  | { status: 'pending' }
  | { status: 'error'; message: string };
