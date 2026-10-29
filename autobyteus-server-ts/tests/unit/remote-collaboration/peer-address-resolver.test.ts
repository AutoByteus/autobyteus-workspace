import { describe, expect, it, vi } from "vitest";
import { RemoteCollaborationSettingsError } from "../../../src/remote-collaboration/domain/remote-collaboration-settings-error.js";
import { PeerAddressResolver } from "../../../src/remote-collaboration/settings/peer-address-resolver.js";

/** one-nodes-tab DS-005, design § Switch-Off Rule, § Loopback Hint Surface (REQ-705, REQ-707, REQ-708, RSK-702). */

const SELF = "srv_self_node_000000000000000000000000";
const B = "srv_peer_b_00000000000000000000000000";
const OTHER = "srv_someone_else_000000000000000000000";

type Answer = { id: string; afterMs?: number } | { error: RemoteCollaborationSettingsError; afterMs?: number } | { never: true };

const unreachable = (url: string, reason: "refused" | "timeout" | "not_found" | "unreachable") =>
  new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${url} could not be reached`, { reason, address: url });

const resolver = (answers: Record<string, Answer>, options: { enabled?: boolean; inContainer?: boolean } = {}) => {
  const fetchNodeId = vi.fn((url: string) => new Promise<string>((resolve, reject) => {
    const answer = answers[url];
    if (!answer) { reject(unreachable(url, "refused")); return; }
    if ("never" in answer) return;
    setTimeout(() => ("id" in answer ? resolve(answer.id) : reject(answer.error)), answer.afterMs ?? 0);
  }));
  return {
    fetchNodeId,
    resolver: new PeerAddressResolver({
      probe: { fetchNodeId },
      capability: { isEnabled: () => options.enabled ?? true },
      ownNodeId: async () => SELF,
      runsInContainer: () => options.inContainer ?? false,
    }),
  };
};

describe("PeerAddressResolver", () => {
  it("keeps the first address, in order, that answers with the expected node; a wrong node is skipped", async () => {
    const f = resolver({
      "http://127.0.0.1:29695": { error: unreachable("http://127.0.0.1:29695", "refused") },
      "http://172.17.0.4:8001": { id: OTHER },
      "http://host.docker.internal:29695": { id: B, afterMs: 5 },
      "http://192.168.2.10:29695": { id: B },
    });
    await expect(f.resolver.resolve(B, ["127.0.0.1:29695", "http://172.17.0.4:8001", "http://host.docker.internal:29695/", "http://192.168.2.10:29695"]))
      .resolves.toBe("http://host.docker.internal:29695");
    expect(f.fetchNodeId).toHaveBeenCalledTimes(4); // asked at once
  });

  it("answers as soon as every address before the match has settled; a black-holed address after it adds no wait", async () => {
    const f = resolver({ "http://a:1": { id: B }, "http://blackhole:1": { never: true } });
    await expect(f.resolver.resolve(B, ["http://a:1", "http://blackhole:1"])).resolves.toBe("http://a:1");
  });

  it("waits for an earlier address that is still being asked, and dedupes repeated addresses", async () => {
    const f = resolver({ "http://slow:1": { id: B, afterMs: 30 }, "http://fast:1": { id: B } });
    await expect(f.resolver.resolve(B, ["http://slow:1", "HTTP://SLOW:1", "http://fast:1"])).resolves.toBe("http://slow:1");
    expect(f.fetchNodeId).toHaveBeenCalledTimes(2);
  });

  it("refuses with every attempt's classified outcome when no address answers as that node", async () => {
    const f = resolver({
      "http://localhost:29695": { error: unreachable("http://localhost:29695", "refused") },
      "http://nas.local:29695": { error: unreachable("http://nas.local:29695", "not_found") },
      "http://web:8080": { error: new RemoteCollaborationSettingsError("PEER_NOT_AUTOBYTEUS", "not an AutoByteus node") },
      "http://other:1": { id: OTHER },
    });
    const error = await f.resolver.resolve(B, ["http://localhost:29695", "http://nas.local:29695", "http://web:8080", "http://other:1"]).catch((e) => e);
    expect(error).toMatchObject({ code: "PEER_UNREACHABLE", details: {
      address: "http://localhost:29695", reason: "refused", loopbackInContainer: false,
      attempts: [
        { address: "http://localhost:29695", result: "refused" },
        { address: "http://nas.local:29695", result: "not_found" },
        { address: "http://web:8080", result: "not_autobyteus" },
        { address: "http://other:1", result: "different_node" },
      ] } });
  });

  it("says loopbackInContainer when this node runs in a container and the first address tried is loopback", async () => {
    const docker = resolver({}, { inContainer: true });
    await expect(docker.resolver.resolve(B, ["http://127.0.0.1:29695", "http://192.168.2.10:29695"])).rejects.toMatchObject({
      code: "PEER_UNREACHABLE", details: { address: "http://127.0.0.1:29695", loopbackInContainer: true } });
    await expect(docker.resolver.resolve(B, ["http://192.168.2.10:29695", "http://127.0.0.1:29695"])).rejects.toMatchObject({
      details: { loopbackInContainer: false } });
    const host = resolver({}, { inContainer: false });
    await expect(host.resolver.resolve(B, ["http://localhost:29695"])).rejects.toMatchObject({ details: { loopbackInContainer: false } });
  });

  it("asks nothing while the switch is off (DEC-709 b), for this node itself, or without a valid address", async () => {
    const off = resolver({ "http://a:1": { id: B } }, { enabled: false });
    await expect(off.resolver.resolve(B, ["http://a:1"])).rejects.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
    const on = resolver({ "http://a:1": { id: B } });
    await expect(on.resolver.resolve(SELF, ["http://a:1"])).rejects.toMatchObject({ code: "PEER_IS_THIS_NODE" });
    await expect(on.resolver.resolve(B, ["", "ftp://x"])).rejects.toMatchObject({ code: "PEER_URL_INVALID" });
    expect(off.fetchNodeId).not.toHaveBeenCalled();
    expect(on.fetchNodeId).not.toHaveBeenCalled();
  });
});
