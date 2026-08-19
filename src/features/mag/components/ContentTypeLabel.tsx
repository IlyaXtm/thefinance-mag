import type { ContentType } from '../types/mag.types';

/**
 * Content type — تحلیل / گزارش / آموزش.
 *
 * Text only, never a coloured badge. It sits beside the market chip and must
 * not compete with it for attention: the chip carries the primary axis, this
 * sets the reader's expectation of what kind of piece it is.
 */
export function ContentTypeLabel({ contentType }: { contentType: ContentType }) {
  return <span className="text-xs text-text-muted">{contentType.name}</span>;
}
