import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { remoteCollaborationSettingsPath, type AppDataDirSource } from "../settings/settings-file-schema.js";

const NODE_KEY_FILE = "node-key.pem";

/** The public half as it travels and is stored (contract §1): base64 of its SPKI DER (`MCowBQYDK2VwAyEA…`). */
const publicKeyText = (key: KeyObject): string => createPublicKey(key).export({ type: "spki", format: "der" }).toString("base64");

/** Whether `text` is a node key's public half as it travels (base64 SPKI DER of an Ed25519 key). */
export const isNodePublicKey = (text: string): boolean => {
  if (text.length > 128 || !/^[A-Za-z0-9+/]+=*$/.test(text)) return false;
  try {
    return createPublicKey({ key: Buffer.from(text, "base64"), format: "der", type: "spki" }).asymmetricKeyType === "ed25519";
  } catch {
    return false;
  }
};

/**
 * Whether `signature` (base64url) is the Ed25519 signature of `data` by the node key whose public half is `publicKey`
 * (base64 SPKI DER, as a peer record keeps it). A malformed key or signature is simply not valid.
 */
export const verifyNodeSignature = (publicKey: string, data: string, signature: string): boolean => {
  try {
    const key = createPublicKey({ key: Buffer.from(publicKey, "base64"), format: "der", type: "spki" });
    if (key.asymmetricKeyType !== "ed25519") return false;
    return verify(null, Buffer.from(data, "utf8"), key, Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
};

/**
 * This node's key pair (autobyteus-661 D-2, contract §1): one Ed25519 key, created once on first use and kept for the
 * life of the node's data in `<data>/remote-collaboration/node-key.pem` (PKCS#8, mode 0600). The private half never
 * leaves this class; its public half is sent when pairing, and every peer request is signed with it (§5).
 */
export class NodeKey {
  private key: Promise<KeyObject> | null = null;

  constructor(private readonly config: AppDataDirSource) {}

  filePath(): string { return remoteCollaborationSettingsPath(this.config, NODE_KEY_FILE); }

  async publicKey(): Promise<string> {
    return publicKeyText(await this.privateKey());
  }

  /** The Ed25519 signature of `data` (UTF-8), base64url. */
  async sign(data: string): Promise<string> {
    return sign(null, Buffer.from(data, "utf8"), await this.privateKey()).toString("base64url");
  }

  private privateKey(): Promise<KeyObject> {
    this.key ??= this.load().catch((error: unknown) => {
      this.key = null;
      throw error;
    });
    return this.key;
  }

  /** Reads the key; creates it when there is none (exclusive create, so two starts never make two keys). */
  private async load(): Promise<KeyObject> {
    const filePath = this.filePath();
    try {
      return this.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const pem = generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    try {
      await fs.writeFile(filePath, pem, { encoding: "utf8", mode: 0o600, flag: "wx" });
      return this.parse(pem);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      return this.parse(await fs.readFile(filePath, "utf8"));
    }
  }

  private parse(pem: string): KeyObject {
    const key = createPrivateKey({ key: pem, format: "pem" });
    if (key.asymmetricKeyType !== "ed25519") throw new Error(`${this.filePath()} is not an Ed25519 node key.`);
    return key;
  }
}
