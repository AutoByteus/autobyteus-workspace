import type {
  BearerCredentialVerifier,
  CredentialVerification,
  PeerRequestVerifier,
  PeerSignedRequest,
} from "../domain/credential-verification.js";
import { NODE_ACCESS_REFUSALS } from "../domain/node-access-refusal.js";

/** A request's credential forms, as the gate reads them. */
export type CredentialRequest = PeerSignedRequest & Readonly<{
  /** The browser WebSocket credential (`access_token` query); only an upgrade may carry it. */
  webSocketQueryCredential: string | null;
}>;

const BEARER_PATTERN = /^\s*Bearer\s+(\S+)\s*$/i;

const readBearer = (header: string | string[] | undefined): string | null => {
  const value = Array.isArray(header) ? (header.length === 1 ? header[0] : undefined) : header;
  return value ? BEARER_PATTERN.exec(value)?.[1] ?? null : null;
};

/**
 * Reads the one credential form of a request (a Bearer header, the WebSocket `access_token` query, or peer signature
 * headers) and returns the client identity the verifier of that kind establishes (design DS-001). A request with
 * none is `NODE_CREDENTIAL_REQUIRED`; with more than one form, or a credential of no known kind,
 * `NODE_CREDENTIAL_INVALID`.
 */
export class NodeCredentialResolver {
  private readonly bearerVerifiers: ReadonlyMap<string, BearerCredentialVerifier>;

  constructor(
    bearerVerifiers: readonly BearerCredentialVerifier[],
    private readonly peerVerifier: PeerRequestVerifier,
  ) {
    this.bearerVerifiers = new Map(bearerVerifiers.map((verifier) => [verifier.prefix, verifier]));
  }

  async identify(request: CredentialRequest): Promise<CredentialVerification> {
    const bearer = readBearer(request.headers.authorization);
    const hasAuthorizationHeader = request.headers.authorization !== undefined;
    const query = request.webSocketQueryCredential;
    const signed = this.peerVerifier.isSigned(request);
    const forms = Number(hasAuthorizationHeader) + Number(query !== null) + Number(signed);
    if (forms === 0) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialRequired };
    }
    if (forms > 1) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialInvalid };
    }
    if (signed) {
      return this.peerVerifier.verify(request);
    }
    const credential = hasAuthorizationHeader ? bearer : query;
    const verifier = credential ? this.verifierFor(credential) : null;
    if (!credential || !verifier) {
      return { ok: false, refusal: NODE_ACCESS_REFUSALS.credentialInvalid };
    }
    return verifier.verify(credential);
  }

  private verifierFor(credential: string): BearerCredentialVerifier | null {
    for (const [prefix, verifier] of this.bearerVerifiers) {
      if (credential.startsWith(prefix)) return verifier;
    }
    return null;
  }
}
