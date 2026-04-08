export class TextEditOperationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'TextEditOperationError';
  }
}

export function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }

  let count = 0;
  let fromIndex = 0;
  while (true) {
    const index = haystack.indexOf(needle, fromIndex);
    if (index === -1) {
      return count;
    }
    count += 1;
    fromIndex = index + needle.length;
  }
}

export function replaceExactBlock(originalContent: string, oldText: string, newText: string): string {
  if (oldText.length === 0) {
    throw new TextEditOperationError('old_text_empty', 'old_text must not be empty.');
  }

  const matchCount = countOccurrences(originalContent, oldText);
  if (matchCount === 0) {
    throw new TextEditOperationError(
      'no_exact_match',
      'Could not find the exact old_text block in the file.'
    );
  }
  if (matchCount > 1) {
    throw new TextEditOperationError(
      'multiple_matches',
      'old_text matched multiple locations. Provide a more specific unique block.'
    );
  }

  return originalContent.replace(oldText, newText);
}

export function insertRelativeToAnchor(
  originalContent: string,
  anchorText: string,
  newText: string,
  position: 'before' | 'after'
): string {
  if (anchorText.length === 0) {
    throw new TextEditOperationError('anchor_text_empty', `${position}_text must not be empty.`);
  }

  const matchCount = countOccurrences(originalContent, anchorText);
  if (matchCount === 0) {
    throw new TextEditOperationError(
      'anchor_not_found',
      `Could not find the exact ${position}_text anchor in the file.`
    );
  }
  if (matchCount > 1) {
    throw new TextEditOperationError(
      'multiple_anchor_matches',
      `${position}_text matched multiple locations. Provide a more specific unique anchor.`
    );
  }

  const replacement = position === 'before' ? `${newText}${anchorText}` : `${anchorText}${newText}`;
  return originalContent.replace(anchorText, replacement);
}
