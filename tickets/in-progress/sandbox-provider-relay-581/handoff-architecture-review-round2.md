# Handoff: architecture re-review of autobyteus-581 (round 2)

- **Package:** `sandbox-provider-relay-581`, **SR-005**. It answers ARCH-REV-001 (Fail).
- **Classification:** Architecture Design Complete, task_size Large, architectural_risk High (unchanged).
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay`, branch `codex/sandbox-provider-relay`, base `origin/personal` @ `9f803aa84d`. Nothing committed.

## What changed since round 1

| Finding | Resolution | Design section |
| --- | --- | --- |
| AR-001 | **The user chose option A (DEC-111).** The host's peer record holds `role: "sandbox"`, written by `SandboxManager`. The gate admits a sandbox peer only to the relay, messages, received-files, peer-run-members and availability. The peer gateway accepts its messages only for host runs whose open Task entry names a run on that sandbox. Refusal codes: `SANDBOX_PEER_ROUTE_REFUSED`, `SANDBOX_MESSAGE_TARGET_REFUSED`. | C11, DS-007, walks |
| AR-002 | One owner: the existing `ProviderRelayAccess`, extended. `ProviderRelayRouting` is dropped. Consumer table: ACP launcher (`relay: {relayId, use: always/whenRelayed}`), Grok, DeepSeek Harness (no local-vault check when relayed), provider factory builder, application scope, standalone host (loud refusal), process slot, native, Claude | § ProviderRelayAccess Consumers |
| AR-003 | C1 is per runtime: the relays with API keys, plus the runtimes on a login token. Native is always `apiKey`. The relay attaches exactly the declared kind; only `loginToken` with the switch off is refused. | C1, C4, walk "native in the same sandbox" |
| AR-004 | Reply marker `x-autobyteus-relay-reply: forwarded/refused`; an unmarked answer is the gate's (NA-13 mapping table); timeouts connect 10 s, headers 300 s, idle 300 s, no total. Walked: provider 401 vs gate 401. | C4 |
| AR-005 | `ProviderRelay.routes.{apiKey, loginToken}`, each with route, local pass header, source, attached headers and dropped caller headers. The forwarder takes several credential headers. Observation fields are per relay (only DeepSeek reads them). | C3 |
| AR-006 | The singletons read relayed mode as read-only configuration (Principle 16's exception) and get passes from the existing slot, throwing when relayed with none. Codex runs one app-server per working directory. | Dependency Rules |
| R-A, R-B, R-D, R-E, R-F | Addressed: the sweep unpairs orphan sandbox peers; creation is serialized; the JWT question is in U-1; an availability check; `peer-relay-client.ts` | Response table |

## New user decisions since round 1

- **DEC-110:** full network; one container per sandbox. The egress container is gone; R-C is moot; FU-581-05 is a later restricted mode.
- **DEC-112:** the public skill `autobyteus-sandboxes` in `AutoByteus/autobyteus-skills` (REQ-018, AC-016).
- **DEC-113:** `create_sandbox` takes `agentPackages`, read-only `sharedFolders` and `lifetimeMinutes`; the relay is always the creating node. New evidence P-14 (read-only mount).

## Documents

- `requirements-doc.md` (Approved, SR-005)
- `design-spec.md` (SR-005; the response table at the top)
- `investigation-notes.md` (P-1 to P-14)
- `solution-revision-record.md` (SR-004, SR-005)
- `design-review-report.md` and `architecture-review-revision-record.md` (round 1)
- `follow-ups.md` (FU-581-01 to 05)

## Route

2026-11-26: the handoff rules were applied. The rule for "Architecture Design Complete with task_size=Large or architectural_risk=High" matched, and the package was sent to `/architecture_reviewer` (delivered).
