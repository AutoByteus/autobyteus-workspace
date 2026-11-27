/**
 * Where the signed list of extensions comes from (extension-contract.md §3): the assets of the fixed release tag
 * `catalog` of `AutoByteus/autobyteus-extensions`, the same URL in every released AutoByteus, and the public key of
 * AutoByteus's catalog signing key, built in.
 *
 * An extension's developer points a node at their own catalog with `AUTOBYTEUS_EXTENSIONS_CATALOG_URL` and
 * `AUTOBYTEUS_EXTENSIONS_CATALOG_PUBLIC_KEY` (a PEM), read once at startup. Whoever sets the node's environment
 * already controls that computer, so this is no way around "only AutoByteus-signed extensions" (DEC-011).
 */
export type ExtensionCatalogSource = Readonly<{
  /** The catalog JSON; its signature is the same URL with `.sig` (base64 Ed25519 over the file's exact bytes). */
  url: string;
  /** PEM of the Ed25519 public key the catalog must verify with. */
  publicKeyPem: string;
}>;

export const EXTENSIONS_CATALOG_URL =
  "https://github.com/AutoByteus/autobyteus-extensions/releases/download/catalog/extensions-catalog.json";

/**
 * The public half of AutoByteus's catalog signing key: the text of `catalog-public-key.pem` in
 * `AutoByteus/autobyteus-extensions` (fingerprint SHA256:75d4d2f80ed35374e7956d736aed66111e3eac76b911eb2367428a27dc64ad4c).
 * The key pair was created on the founder's Mac on 2026-11-26 by the setup script he approved (autobyteus-657); its
 * private half exists only as that repository's secret `EXTENSIONS_CATALOG_SIGNING_KEY` and in his own backup.
 * It changes only together with the repository's key, as a coordinated change: every installed app refuses a catalog
 * signed with another key.
 */
export const EXTENSIONS_CATALOG_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEACR475ne4cMdyszBfr56Wg/xrgIZd/FzdhLa9uvcCG2A=
-----END PUBLIC KEY-----
`;

export const readExtensionCatalogSource = (env: NodeJS.ProcessEnv = process.env): ExtensionCatalogSource => {
  const url = env.AUTOBYTEUS_EXTENSIONS_CATALOG_URL?.trim();
  const publicKeyPem = env.AUTOBYTEUS_EXTENSIONS_CATALOG_PUBLIC_KEY?.trim();
  return { url: url || EXTENSIONS_CATALOG_URL, publicKeyPem: publicKeyPem || EXTENSIONS_CATALOG_PUBLIC_KEY_PEM };
};
