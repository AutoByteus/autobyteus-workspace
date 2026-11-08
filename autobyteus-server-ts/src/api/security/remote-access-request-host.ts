import { isIP } from "node:net";
import { parseRequestHostName } from "./request-host-name.js";

/** The node's allowed-host rule: which names a request may address the node by (port not compared). */
export type RequestHostPolicy = {
  /** `true` for a missing `Host` (behaves as before) and for an allowed host; `false` for a malformed or other host. */
  isAllowed(hostHeader: string | undefined): Promise<boolean>;
};

export type RequestHostPolicyInput = {
  readonly allowedHostNames: ReadonlySet<string>;
  readonly allowedHostSuffixes: readonly string[];
  /** Asked only when no class or configured name matches. */
  readonly isPairedPhoneHost: (hostName: string) => Promise<boolean>;
};

/** Local names public DNS cannot give an attacker: special-use and home-network suffixes. */
const LOCAL_NAME_SUFFIXES = [".localhost", ".local", ".lan", ".home.arpa", ".internal"];
/** Tailscale names: outside a tailnet they resolve only to Tailscale's Funnel relays. */
const TAILSCALE_SUFFIX = ".ts.net";

const isUnderSuffix = (name: string, suffix: string): boolean => name === suffix || name.endsWith(`.${suffix}`);

/** Names a node accepts with no setting: IP addresses, `localhost`, dotless and local names, `*.ts.net`. */
const isInAllowedHostClass = (name: string): boolean =>
  isIP(name) !== 0
  || name === "localhost"
  || !name.includes(".")
  || LOCAL_NAME_SUFFIXES.some((suffix) => name.endsWith(suffix))
  || name.endsWith(TAILSCALE_SUFFIX);

export const createRequestHostPolicy = (input: RequestHostPolicyInput): RequestHostPolicy => ({
  async isAllowed(hostHeader) {
    if (hostHeader === undefined) {
      return true;
    }
    const name = parseRequestHostName(hostHeader);
    if (name === null) {
      return false;
    }
    if (isInAllowedHostClass(name) || input.allowedHostNames.has(name)) {
      return true;
    }
    if (input.allowedHostSuffixes.some((suffix) => isUnderSuffix(name, suffix))) {
      return true;
    }
    return input.isPairedPhoneHost(name);
  },
});
