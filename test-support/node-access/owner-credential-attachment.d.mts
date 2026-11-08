/** A fresh owner credential in the node's format (`own_` + 32 random bytes). */
export function createTestOwnerCredential(): string;
/** Attaches `credential` to this process's `fetch` and `http.request` calls to the loopback node at `baseUrl`. */
export function attachOwnerCredential(baseUrl: string, credential: string): () => void;
