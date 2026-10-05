import { SocialMark } from '@/shared/ui/SocialMark';
import { TELEGRAM_CHANNEL_URL } from '../lib/site';

/**
 * «کانال تلگرام فایننس» — the closing row of the article rail's onward panel.
 *
 * Asked for in that exact spot, under «بیشتر در …»: the point where a reader
 * who finished the panel is deciding where to go next.
 *
 * A row inside the onward card rather than a card of its own, and the reason
 * is the rail's height budget. The rail is ONE sticky element that must fit
 * the viewport (see ArticleAside), so every pixel here comes off the contents
 * list; a separate card would also spend a 24px gap. The ToC's reservation was
 * widened by exactly this row's height.
 *
 * Plain copy: no follower count, no «فوری», no urgency — the brand list rules
 * all three out, and a channel link needs none of them.
 */
export function TelegramChannelLink() {
  return (
    <a
      href={TELEGRAM_CHANNEL_URL}
      rel="noopener noreferrer"
      target="_blank"
      className="flex min-h-11 items-center gap-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:text-accent"
    >
      <SocialMark icon="telegram" className="h-[18px] w-[18px] shrink-0 text-accent" />
      کانال تلگرام فایننس
    </a>
  );
}
