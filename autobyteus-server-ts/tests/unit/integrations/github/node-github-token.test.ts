import { afterEach, describe, expect, it, vi } from "vitest";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";

const resolveForUse = vi.hoisted(() => vi.fn());
const requireService = vi.hoisted(() => vi.fn());
vi.mock("../../../../src/secret-management/secret-vault-runtime.js", () => ({
  getSecretVaultRuntime: () => ({ requireService }),
}));

const { readNodeGitHubToken } = await import("../../../../src/integrations/github/node-github-token.js");

describe("readNodeGitHubToken", () => {
  afterEach(() => {
    resolveForUse.mockReset();
    requireService.mockReset();
  });

  it("reads the GitHub connection's vault entry at the moment of use", async () => {
    const token = SecretValue.fromString("github_pat_reader");
    requireService.mockReturnValue({ resolveForUse });
    resolveForUse.mockResolvedValue(token);
    expect(await readNodeGitHubToken()).toBe(token);
    expect(resolveForUse).toHaveBeenCalledWith({ kind: "integration", integrationId: "github" });
  });

  it("is null when GitHub is not connected (no entry)", async () => {
    requireService.mockReturnValue({ resolveForUse });
    resolveForUse.mockRejectedValue(new SecretVaultError("NOT_FOUND", false, "SECRET_NOT_FOUND"));
    expect(await readNodeGitHubToken()).toBeNull();
  });

  it("throws any other vault failure, such as an unavailable vault", async () => {
    const unavailable = new SecretVaultError("VAULT_UNAVAILABLE", true, "SECRET_VAULT_UNAVAILABLE");
    requireService.mockImplementation(() => { throw unavailable; });
    await expect(readNodeGitHubToken()).rejects.toBe(unavailable);
  });
});
