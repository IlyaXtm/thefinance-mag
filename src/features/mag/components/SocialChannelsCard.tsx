import { SocialMark } from '@/shared/ui/SocialMark';
import { SOCIAL_LINKS } from '../lib/nav';
import { SidebarCard } from './SidebarCard';

/**
 * «فایننس در شبکه‌های اجتماعی» — the closing row's third card, as the team's
 * Faraz reference ends with one. The same SOCIAL_LINKS the footer renders, so
 * a channel added in `site.ts` appears in both and neither can drift.
 *
 * No follower counts: the brand list rules them out, and a number beside a
 * channel is a claim about popularity the magazine does not make elsewhere.
 */
export function SocialChannelsCard() {
  if (SOCIAL_LINKS.length === 0) return null;

  return (
    <SidebarCard title="فایننس در شبکه‌های اجتماعی">
      <p className="text-[14px] font-light leading-[1.85] text-text-secondary">
        تحلیل‌ها و آموزش‌های تازه را در کانال‌های رسمی فایننس دنبال کنید.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {SOCIAL_LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              rel="noopener noreferrer"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-interactive px-4 text-[14px] text-text-primary transition-colors hover:border-accent hover:bg-accent-soft"
            >
              {link.icon && <SocialMark icon={link.icon} className="h-4 w-4 shrink-0" />}
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}
