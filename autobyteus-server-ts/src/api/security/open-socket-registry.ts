import { clientIdentityId, type ClientIdentity } from "../../node-access/domain/client-identity.js";
import type { ClientRevocation } from "../../node-access/domain/credential-verification.js";
import { webSocketCloseCodeFor } from "../../node-access/domain/node-access-refusal.js";

/** An open socket as the registry closes it. */
export type ClosableSocket = Readonly<{ close(code: number, reason: string): void }>;

type Entry = Readonly<{ identity: ClientIdentity; socket: ClosableSocket }>;

/**
 * The open sockets of every client, by its identity (NA-11, design M-4): the gated WebSocket routes, GraphQL
 * subscription sockets and the peer run-observation socket register each accepted socket and remove it when it
 * closes. A revocation closes every open socket of the revoked clients at once, with 4403 and the revocation code.
 */
export class OpenSocketRegistry {
  private readonly entries = new Set<Entry>();

  /** Registers an accepted socket; the returned function removes it (call it when the socket closes). */
  register(identity: ClientIdentity, socket: ClosableSocket): () => void {
    const entry: Entry = Object.freeze({ identity, socket });
    this.entries.add(entry);
    return () => { this.entries.delete(entry); };
  }

  close(revocation: ClientRevocation): void {
    for (const entry of [...this.entries]) {
      if (entry.identity.kind !== revocation.kind) continue;
      if (revocation.id !== null && clientIdentityId(entry.identity) !== revocation.id) continue;
      this.entries.delete(entry);
      try {
        entry.socket.close(webSocketCloseCodeFor(revocation.refusal), revocation.refusal.code);
      } catch {
        // A socket that is already closing needs nothing more.
      }
    }
  }
}
