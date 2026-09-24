import { InvalidInputError } from "#exception";

/** Lara stores a translation unit's context as a pair: one side alone is not accepted. */
export function validateSentenceContext(
  sentence_before?: string,
  sentence_after?: string
): void {
  if (
    (sentence_before && !sentence_after) ||
    (!sentence_before && sentence_after)
  ) {
    throw new InvalidInputError(
      "Please provide both sentence_before and sentence_after"
    );
  }
}
