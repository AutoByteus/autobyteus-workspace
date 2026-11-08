/**
 * A web origin as the node reads one (a request's `Origin`, an `AUTOBYTEUS_ALLOWED_ORIGINS` entry): an `http:` or
 * `https:` URL, else `null`. The node's origin rule and its allow-list parser share this one reading.
 */
export const parseWebOrigin = (value: string): URL | null => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
};
