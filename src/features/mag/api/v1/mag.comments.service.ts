import * as mock from './mag.comments.mock';
import * as real from './mag.comments.api';

/**
 * Single source-switch point for comments, matching the pattern used by the
 * main Mag service.
 *
 * The structural type below is what keeps the two implementations honest: if
 * a signature drifts, this fails at compile time rather than at runtime.
 */
type CommentSource = {
  getComments: typeof mock.getComments;
  submitComment: typeof mock.submitComment;
};

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const source: CommentSource = USE_MOCK ? mock : real;

export const getComments: CommentSource['getComments'] = (slug) => source.getComments(slug);

export const submitComment: CommentSource['submitComment'] = (submission) =>
  source.submitComment(submission);
