import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ApplicationDatabaseLocation } from "../../config/application-database-location.js";
import { assertWindowsExclusiveAcl } from "../windows-exclusive-acl.js";
import {
  SECRET_VAULT_ROOT_KEY_BYTES,
} from "../crypto/secret-vault-crypto.js";
import { SecretVaultError } from "../domain/secret-vault-types.js";

export type SecretRootKeyInspection =
  | { state: "ABSENT" }
  | { state: "VALID"; key: Buffer }
  | { state: "UNSAFE" };

const locked = (cause?: unknown): SecretVaultError =>
  new SecretVaultError("VAULT_LOCKED", false, "SECRET_VAULT_LOCKED", { cause });

const isPrivateOwnerFile = (filePath: string, stat: Awaited<ReturnType<typeof fsp.lstat>>): boolean => {
  if (stat.isSymbolicLink() || !stat.isFile()) return false;
  if (process.platform === "win32") {
    try {
      assertWindowsExclusiveAcl(filePath);
      return true;
    } catch {
      return false;
    }
  }
  return (typeof process.getuid !== "function" || Number(stat.uid) === process.getuid())
    && (Number(stat.mode) & 0o077) === 0;
};

const hardenWindowsAcl = (filePath: string): void => {
  if (process.platform !== "win32") return;
  const username = os.userInfo().username;
  execFileSync("icacls.exe", [filePath, "/inheritance:r", "/grant:r", `${username}:(F)`], {
    windowsHide: true,
    stdio: "ignore",
  });
};

export class SecretRootKeyFile {
  constructor(private readonly location: ApplicationDatabaseLocation) {}

  async inspectExisting(): Promise<SecretRootKeyInspection> {
    let stat: Awaited<ReturnType<typeof fsp.lstat>>;
    try {
      stat = await fsp.lstat(this.location.rootKeyPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: "ABSENT" };
      return { state: "UNSAFE" };
    }
    if (!isPrivateOwnerFile(this.location.rootKeyPath, stat)) return { state: "UNSAFE" };

    let key: Buffer;
    try {
      key = await fsp.readFile(this.location.rootKeyPath);
    } catch {
      return { state: "UNSAFE" };
    }
    if (key.length !== SECRET_VAULT_ROOT_KEY_BYTES) {
      key.fill(0);
      return { state: "UNSAFE" };
    }
    return { state: "VALID", key };
  }

  async readRequired(): Promise<Buffer> {
    const inspected = await this.inspectExisting();
    if (inspected.state !== "VALID") throw locked();
    return inspected.key;
  }

  async createExclusive(): Promise<Buffer> {
    const directory = path.dirname(this.location.rootKeyPath);
    await fsp.mkdir(directory, { recursive: true, mode: 0o700 });
    const key = randomBytes(SECRET_VAULT_ROOT_KEY_BYTES);
    let handle: fsp.FileHandle | null = null;
    try {
      handle = await fsp.open(this.location.rootKeyPath, "wx", 0o600);
      await handle.writeFile(key);
      await handle.sync();
      await handle.close();
      handle = null;
      if (process.platform === "win32") hardenWindowsAcl(this.location.rootKeyPath);
      else await fsp.chmod(this.location.rootKeyPath, 0o600);
      const inspected = await this.inspectExisting();
      if (inspected.state !== "VALID") throw locked();
      inspected.key.fill(0);
      return key;
    } catch (cause) {
      key.fill(0);
      throw locked(cause);
    } finally {
      await handle?.close();
    }
  }
}
