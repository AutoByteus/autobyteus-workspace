# Solution Revision Record: autobyteus-581

History before this Task: [history-484/solution-revision-record.md](history-484/solution-revision-record.md) (484 SR-001 to SR-004; the user's decisions DEC-001 to DEC-019).

## Revision Index

| Revision | Phase | Trigger | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements + Evidence | Task autobyteus-581 (2026-11-26) | N/A | Ready for Approval | REQ-001 to REQ-016, AC-001 to AC-014, DEC-101 to DEC-108 | Requirements baseline; two decisions need the user |

## SR-001: Requirements baseline

- **Trigger:** autobyteus-581 from `/project_task_manager`, with the user's direction from 484.
- **Evidence:** new probes P-1 to P-10 (network reachability, runtime request shapes, egress proxy, internal-network forwarding) and code reading (investigation-notes.md).
- **Findings that shaped the requirements:**
  - the request shape depends on the credential kind (P-4, P-6), so the relayed node must learn the kind (REQ-003);
  - default Docker networking breaks DEC-016 (P-2), so a companion container is needed (DEC-103);
  - Antigravity cannot be relayed (P-8, DEC-101);
  - remote collaboration is off by default (DEC-104);
  - DESIGN rule 9 sets the sandbox image (DEC-106);
  - the gate buffers peer bodies (QR-004).
- **Approval:** pending. DEC-105 and DEC-108 need the user.
- **Design:** not started. The draft contract (history-484) will be revised in the design.
- **Next:** ask the user; then the architecture design.

## SR-002: Requirements approved by the user

- **Trigger:** the user's answers, 2026-11-26.
  - DEC-109: credential kind given at start ("who is starting the sandbox should provide this kind of variable").
  - DEC-105: macOS implemented now; other platforms designed and validated, then a follow-up.
  - DEC-108: prove both API key and login token live.
- **Changed:** REQ-003 (start variable plus mismatch refusal), AC-005 (live proof), Out Of Scope (platforms: implementation only).
- **Approval:** **Approved** by the user (this baseline).
- **Next:** architecture design, covering all platforms in the contract and implementing macOS.

## SR-003: Architecture design complete

- **Trigger:** the approved requirements (SR-002).
- **Design:** [design-spec.md](design-spec.md), status Ready. The contract is revised from the 484 draft with V-8 to V-12:
  - V-8: relays and kinds as a start variable;
  - V-9: the kind in the signed path;
  - V-10: `run_in_sandbox`;
  - V-11: remote collaboration on;
  - V-12: Codex's own `CODEX_HOME` for login tokens.
- **Platforms:** the contract and walks cover Linux and Windows; macOS is implemented.
- **New evidence:** P-13 (Codex per-provider bearer).
- **Follow-ups added:** FU-581-03 (media providers), FU-581-04 (integrations).
- **Classification:** task_size **Large**, architectural_risk **High**. Route: independent architecture review.

## SR-004: Revision after architecture review ARCH-REV-001 (Fail) and the user's DEC-110

- **Trigger:**
  - `design-review-report.md` ARCH-REV-001: AR-001 (Requirement Gap), AR-002 to AR-006 (Design Impact), R-A to R-F;
  - the user's DEC-110 (full network, no companion container), 2026-11-26.
- **Requirements:**
  - REQ-010 and AC-009 revised (DEC-110);
  - REQ-017, AC-015 and DEC-111 added (AR-001): **Needs user**;
  - status Ready for Approval, for DEC-111 only. REQ-001 to REQ-016 keep their SR-002 approval.
- **Design** (design-spec.md SR-004):
  - one relay owner (the existing `ProviderRelayAccess`, extended), with a consumer table (AR-002);
  - C1 kind per runtime (AR-003);
  - C4 kind in path, reply marking, timeouts (AR-004);
  - C3 per-kind routes and forwarder headers (AR-005);
  - singletons via read-only configuration plus the existing slot, failing loudly; Codex per working directory (AR-006);
  - C11 sandbox peer role, gate rule and gateway target rule (AR-001, option A pending);
  - one container per sandbox; egress container and DS-004 removed (DEC-110).
- **Follow-up added:** FU-581-05 (restricted-network mode).
- **Classification:** unchanged, Large / High.
- **Next:** the user answers DEC-111; then the package goes back to architecture review.

## SR-005: User decisions DEC-111 (option A), DEC-112 (public skill), DEC-113 (shared folders)

- **Trigger:** the user, 2026-11-26.
  - DEC-111: option A, given with "let's go" after the final summary that asked for it.
  - DEC-112: a public skill in `AutoByteus/autobyteus-skills`.
  - DEC-113: `create_sandbox` JSON with `agentPackages`, read-only `sharedFolders` and `lifetimeMinutes`; the relay is always the creating node.
- **New evidence:** P-14 (read-only mount: write and delete refused even as root).
- **Requirements:** **Approved** (SR-005), REQ-001 to REQ-018.
- **Design:** C7 and C8 extended with shared folders and walked (create, refusal, write attempt). ⟨DEC-111⟩ parts are final. The skill was added to scope and files.
- **Classification:** unchanged, Large / High.
- **Next:** architecture re-review (round 2).

## SR-006: Revision after architecture review ARCH-REV-002 (Fail, narrow: AR-007)

- **Trigger:** `design-review-report.md` ARCH-REV-002. AR-001 to AR-006 resolved; AR-007 blocking; N-1, N-2, R-G to R-I and stale text non-blocking.
- **Design** (design-spec.md SR-006):
  - **C11 revised (AR-007):**
    - messages and peer-run-members use the **existing** link checks (`storedLinkCheck`, `PeerRunMembersReceiver`), with sandbox wording for their refusals; no second "open Task" rule;
    - received-files (no target root) get one new check for sandbox callers: some host Task entry names a run on the sandbox (`SANDBOX_FILES_REFUSED`);
    - walks added: an answer with a file, an upload with no delegation;
    - DS-007 shows which handler checks what.
  - **Non-blocking items:**
    - N-1: unmarked other statuses map to `RELAY_PEER_FAILED`;
    - N-2: native gets `routeForNativeProvider`;
    - R-G: extended shared-folder refusals;
    - R-H: the invite carries the role, saved atomically by the exchange;
    - stale text fixed.
  - R-I is taken to the user as DEC-114 (whether any paired peer may use the relay).
- **Requirements:** unchanged unless DEC-114 changes REQ-002.
- **Next:** the user's answer on DEC-114, then architecture round 3 (C11, DS-007, plus C4's peer condition if DEC-114 changes it).

## SR-007: The user revises DEC-111 to option B and decides DEC-114

- **Trigger:** the user, 2026-11-26: "the sandbox is able to communicate with the node which it is paired with … I don't want to add a lot of weird logic … the nodes which are paired are able to communicate with each other."
- **Requirements:**
  - DEC-111 revised to option B: a sandbox is a normal paired peer; the risk is accepted (FU-581-06 keeps the designed restriction);
  - DEC-114: any paired peer may use the relay (REQ-002 unchanged);
  - REQ-017, AC-015 and AC-009 rewritten. Status remains **Approved** (user decisions).
- **Design:** C11 reduced to a lifecycle mark (`role: "sandbox"`, written at pairing, read by the start sweep and the Nodes page). The gate route rule, the files check, the sandbox refusal wording and DS-007 are removed, so AR-007's subject no longer exists. The SR-006 non-blocking fixes (N-1, N-2, R-G, R-H) stay.
- **Classification:** Large / High (unchanged).
- **Next:** architecture review round 3.

## Architecture review result: ARCH-REV-003 Pass (informational)

- **Review:** 2026-11-26, Pass for SR-006 and SR-007. The reviewer routed the package to `/implementation_engineer` (delivered), so no forwarding from here.
- **Text fixes made from its non-blocking notes:**
  - N-3: REQ-018 wording aligned with DEC-111 option B; stale design text corrected;
  - N-4: the Nodes page label chain added to the file mapping.
- These are evidence-only corrections; no behavior or approval change.

## SR-008: Codex login token after the live check (IR-001, IMP-10)

- **Trigger:** `/implementation_engineer` IR-001. U-1 failed live as designed: WebSocket transport, then an account mismatch. R-D answered: the node pass is accepted.
- **Decision:** DEC-115, by the Solution Designer applying the user's DEC-010:
  - pass the relay node's ChatGPT account ID as a start variable;
  - turn off Codex's Responses WebSocket transport for the relayed app-server;
  - one live check; if it fails, "not supported".
- **Design:** C1 gains `AUTOBYTEUS_PROVIDER_RELAY_CODEX_ACCOUNT_ID`; the Codex login-token walk is revised.
- **U-2 (Grok):** needs a run while the user's Grok login is fresh. **Claude:** needs the user's `setup-token` in the test vault. Both are asked of the user.
- **Review impact:** a narrow, design-local change inside the reviewed C1/C10 shape (one identifier variable and one launch flag); no change to ownership, routes or security boundaries. It does not reopen architecture review.
