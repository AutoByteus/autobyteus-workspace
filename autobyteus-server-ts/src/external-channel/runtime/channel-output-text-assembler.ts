export const appendOutputTextFragment = (
  current: string,
  incoming: string,
): string => {
  const normalizedIncoming = normalizeOptionalRawString(incoming);
  if (!normalizedIncoming) {
    return current;
  }
  if (!current) {
    return normalizedIncoming;
  }
  if (normalizedIncoming === current) {
    return current;
  }
  if (normalizedIncoming.startsWith(current)) {
    return normalizedIncoming;
  }
  if (current.startsWith(normalizedIncoming)) {
    return current;
  }

  const overlapLength = findSuffixPrefixOverlapLength(current, normalizedIncoming);
  return `${current}${normalizedIncoming.slice(overlapLength)}`;
};

export const chooseFinalOutputText = (
  currentFinal: string | null,
  incomingFinal: string,
): string | null => {
  const normalizedIncoming = normalizeOptionalRawString(incomingFinal);
  if (!normalizedIncoming) {
    return normalizeOptionalRawString(currentFinal);
  }
  const normalizedCurrent = normalizeOptionalRawString(currentFinal);
  if (!normalizedCurrent) {
    return normalizedIncoming;
  }
  return appendOutputTextFragment(normalizedCurrent, normalizedIncoming);
};

const findSuffixPrefixOverlapLength = (
  current: string,
  incoming: string,
): number => {
  const maxOverlapLength = Math.min(current.length, incoming.length);
  for (let length = maxOverlapLength; length > 0; length -= 1) {
    const candidate = incoming.slice(0, length);
    if (current.endsWith(candidate) && isSafeOverlap(candidate)) {
      return length;
    }
  }
  return 0;
};

const isSafeOverlap = (value: string): boolean =>
  value.length > 1 || /[\s\p{P}\p{S}]/u.test(value);

const normalizeOptionalRawString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim().length > 0 ? value : null;
};
