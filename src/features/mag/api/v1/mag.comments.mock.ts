import type {
  CommentSubmission,
  CommentSubmitResult,
  CommentThread,
} from '../../types/mag-comments.types';

/**
 * Comment mock. Same return shapes as the real API.
 *
 * Two fixtures matter for building the UI honestly:
 *   - an article WITH comments, including one reply, so nesting is exercised
 *   - an article WITHOUT comments, so the hidden-section case is visible
 *
 * If the mock always returned comments, the empty case would only be
 * discovered in production, where it matters most: most articles will have
 * zero comments for a long time.
 */

const LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 300);
const FORCE_FAIL = process.env.NEXT_PUBLIC_MOCK_FAIL === '1';

async function simulate<T>(value: T): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  if (FORCE_FAIL) throw new Error('Simulated failure (NEXT_PUBLIC_MOCK_FAIL=1)');
  return value;
}

const THREADS: Record<string, CommentThread> = {
  'bank-half-year-financials': {
    total: 3,
    items: [
      {
        id: 'c1',
        authorName: 'سارا احمدی',
        avatarUrl: null,
        content:
          'ممنون از تحلیل دقیق. سؤالی داشتم: نسبت کفایت سرمایه بانک‌ها در این گزارش با دوره قبل چه تفاوتی داشت؟',
        createdAt: '2026-08-18T14:20:00+03:30',
        replies: [
          {
            id: 'c1r1',
            authorName: 'مریم رضایی',
            avatarUrl: null,
            content:
              'سؤال خوبی است. در بخش صورت‌های مالی به آن اشاره شده؛ روند در مجموع صعودی بوده اما نه در همه بانک‌ها یکسان.',
            createdAt: '2026-08-18T16:05:00+03:30',
            replies: [],
          },
        ],
      },
      {
        id: 'c2',
        authorName: 'کاربر مهمان',
        avatarUrl: null,
        content: 'مطلب کاربردی بود. لطفاً درباره صندوق‌های درآمد ثابت هم بنویسید.',
        createdAt: '2026-08-19T09:40:00+03:30',
        replies: [],
      },
    ],
  },
};

const EMPTY: CommentThread = { items: [], total: 0 };

export async function getComments(slug: string): Promise<CommentThread> {
  return simulate(THREADS[slug] ?? EMPTY);
}

export async function submitComment(
  _submission: CommentSubmission,
): Promise<CommentSubmitResult> {
  return simulate<CommentSubmitResult>({ status: 'pending' });
}
