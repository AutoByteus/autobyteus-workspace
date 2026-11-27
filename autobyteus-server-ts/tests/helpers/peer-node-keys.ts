import { createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { PeerConnector } from "../../src/remote-collaboration/channel/peer-connector.js";
import { PeerRequestSigner } from "../../src/remote-collaboration/channel/peer-request-signer.js";
import type { PeerVerificationKey } from "../../src/remote-collaboration/channel/node-key-peer-verifier.js";

/** A node key held in memory for tests (the `NodeKey` surface the signer and pairing use); never written to disk. */
export type TestNodeKey = Readonly<{ publicKeyText: string; publicKey(): Promise<string>; sign(data: string): Promise<string> }>;

export const testNodeKey = (): TestNodeKey => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const publicKeyText = createPublicKey(privateKey).export({ type: "spki", format: "der" }).toString("base64");
  return Object.freeze({
    publicKeyText,
    publicKey: async () => publicKeyText,
    sign: async (data: string) => sign(null, Buffer.from(data, "utf8"), privateKey).toString("base64url"),
  });
};

/** A signer with a test key; `now` fixes its clock. */
export const testSigner = (key: TestNodeKey = testNodeKey(), now?: () => number): PeerRequestSigner =>
  new PeerRequestSigner({ key, ...(now ? { now } : {}) });

export const testConnector = (): PeerConnector => new PeerConnector();

/** The verifier's view of a peer paired by plain address with `key`. */
export const plainAddressPeerKey = (key: TestNodeKey): PeerVerificationKey => Object.freeze({ publicKey: key.publicKeyText, machine: null });
