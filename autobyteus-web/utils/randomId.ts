/**
 * A random id for a message, a command or a client-made key (autobyteus-277 DEC-014): a UUID. `crypto.randomUUID` exists
 * only in a secure context, and the phone also runs on the documented trusted private HTTP pairing (a non-secure
 * origin), where it is missing; there the same UUID v4 shape is built from `crypto.getRandomValues`, which every
 * context has. The one owner of this rule; callers add their own prefix.
 */
export const createRandomId = (): string => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
