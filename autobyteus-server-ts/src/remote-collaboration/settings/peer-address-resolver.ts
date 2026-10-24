import { normalizeNodeBaseUrl } from "../../remote-access/services/url-normalization.js";
import {
  RemoteCollaborationSettingsError,
  type PeerAddressAttempt,
  type PeerAddressAttemptResult,
} from "../domain/remote-collaboration-settings-error.js";
import type { PeerIdentityProbe } from "./peer-directory.js";
import type { RemoteCollaborationCapability } from "./remote-collaboration-capability.js";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const isLoopback = (baseUrl: string): boolean => {
  try { return LOOPBACK_HOSTS.has(new URL(baseUrl).hostname.toLowerCase()); } catch { return false; }
};

/**
 * Inside a container, a loopback address is the container itself (one-nodes-tab REQ-708, design § Loopback Hint
 * Surface): the Nodes page then explains it and suggests `host.docker.internal`.
 */
export const loopbackInContainer = (baseUrl: string, runsInContainer: () => boolean): boolean =>
  isLoopback(baseUrl) && runsInContainer();

type Settled = Readonly<{ address: string; nodeId: string } | { address: string; result: PeerAddressAttemptResult }>;

const resultOf = (error: unknown): PeerAddressAttemptResult => {
  if (error instanceof RemoteCollaborationSettingsError && error.code === "PEER_UNREACHABLE") return error.details.reason ?? "unreachable";
  if (error instanceof RemoteCollaborationSettingsError && error.code === "PEER_NOT_AUTOBYTEUS") return "not_autobyteus";
  if (error instanceof RemoteCollaborationSettingsError && error.code === "NODE_IDENTITY_NOT_MIGRATED") return "identity_pending";
  return "unreachable";
};

/**
 * The address that works *for this node* to reach another node (one-nodes-tab DS-005, DEC-702): this node tries the
 * given addresses, in their order, and keeps the first one at which the expected node answers. All are asked at once,
 * each within the peer request bound; an answer is returned as soon as every address before it has settled, so a
 * black-holed address after the match adds no wait (RSK-702). Read-only. Asking another node is a request to it, so
 * the switch must be on (design § Switch-Off Rule, DEC-709 (b)).
 */
export class PeerAddressResolver {
  constructor(private readonly dependencies: Readonly<{
    probe: PeerIdentityProbe;
    capability: Pick<RemoteCollaborationCapability, "isEnabled">;
    ownNodeId(): Promise<string>;
    runsInContainer(): boolean;
  }>) {}

  async resolve(nodeId: string, baseUrls: readonly string[]): Promise<string> {
    if (!this.dependencies.capability.isEnabled()) {
      throw new RemoteCollaborationSettingsError("REMOTE_COLLABORATION_OFF", "Turn on Remote Collaboration before looking for another node's address.");
    }
    if (nodeId === await this.dependencies.ownNodeId()) {
      throw new RemoteCollaborationSettingsError("PEER_IS_THIS_NODE", "That node is this node itself.");
    }
    const candidates = this.candidatesOf(baseUrls);
    if (!candidates.length) throw new RemoteCollaborationSettingsError("PEER_URL_INVALID", "No valid address was given.");
    const settled = await this.firstMatch(nodeId, candidates);
    if ("nodeId" in settled) return settled.address;
    const attempts = settled.attempts;
    const first = attempts[0]!;
    throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `No address answered as that node; the first tried was ${first.address}.`, {
      address: first.address,
      ...(first.result === "refused" || first.result === "timeout" || first.result === "not_found" || first.result === "unreachable" ? { reason: first.result } : {}),
      loopbackInContainer: loopbackInContainer(first.address, this.dependencies.runsInContainer),
      attempts,
    });
  }

  /** The valid addresses, normalized, each once, in the given order. */
  private candidatesOf(baseUrls: readonly string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of baseUrls) {
      let baseUrl: string;
      try { baseUrl = normalizeNodeBaseUrl(raw); } catch { continue; }
      const key = baseUrl.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(baseUrl);
    }
    return result;
  }

  private firstMatch(nodeId: string, candidates: readonly string[]): Promise<Readonly<{ nodeId: string; address: string }> | Readonly<{ attempts: PeerAddressAttempt[] }>> {
    return new Promise((resolve) => {
      const outcomes: (Settled | undefined)[] = candidates.map(() => undefined);
      let done = false;
      const decide = (): void => {
        if (done) return;
        for (const outcome of outcomes) {
          if (!outcome) return; // an earlier address is still being asked
          if ("nodeId" in outcome && outcome.nodeId === nodeId) { done = true; resolve(outcome); return; }
        }
        done = true;
        resolve({ attempts: outcomes.map((outcome) => Object.freeze({
          address: outcome!.address,
          result: "nodeId" in outcome! ? "different_node" as const : outcome!.result,
        })) });
      };
      candidates.forEach((address, index) => {
        this.dependencies.probe.fetchNodeId(address).then(
          (answered) => { outcomes[index] = { address, nodeId: answered }; },
          (error: unknown) => { outcomes[index] = { address, result: resultOf(error) }; },
        ).finally(decide);
      });
    });
  }
}
