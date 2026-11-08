# autobyteus-437 — Architecture Design Complete, round 2 (answers ARCH-REV-001)

- Package: `node-universal-authentication-437`, SR-005; task_size `Large`, architectural_risk `High`
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437`, `codex/node-universal-authentication-437`, `origin/personal` @ `b690a5dfdb`; documents uncommitted; no source changed
- Approval basis: requirements approved by the user (SR-002); design, contract and building slice 1 after a review pass approved by the user (SR-004). Round 2 changes no approved behavior (SR-005; DEC-015 records the setup-code refinement within DEC-003).

## Finding resolutions (design-spec.md, "Round 2 Mechanisms")

| Finding | Resolution | Contract |
| --- | --- | --- |
| AR-001 | M-1: the node's first module (`launch-credential-intake.ts`, first import of `app.ts`) reads and deletes `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL` before any other module loads; the IPC channel exists only on Windows | NA-15, NAS-31 |
| AR-002 | M-2: setup codes on demand through a local control socket (0600; Windows named pipe), used by `autobyteus-docker setup-code` and a node-access CLI, and by owner desktops; never in files or logs | NA-5, NA-10, NAS-32, NAS-33 |
| AR-003 | M-3: the hook decides `/ws/*`; `registerGatedWebSocketRoute` delivers 4401/4403; per-handler calls and the skip removed; architecture test over all routes | §2 |
| AR-004 | M-4: open-socket registry by identity; credential owners publish revocations; node-desktop re-check removed; §5 corrected | NA-11, NAS-37 |
| AR-005 | M-5: `McpGatewayTokenService` (env token wins; else created and stored 0600), owner routes show/regenerate, panel and docs | NA-12 |
| AR-006 | M-6: client address with subnets (classifier keeps `cidr`); Tailscale also requires the local address to be this computer's Tailscale address; examples per rule; RSK-005 | NA-3 |
| AR-007 | M-7: signed string includes from/to node IDs; receiver check; not before process start; gate `preParsing`/`preValidation` body integrity | NA-9, NAS-36, NAS-38 |
| AR-008 | M-8: (a) `setup-code`/`start`/`upgrade` recreate stale containers; (b) Nodes page `NODE_NETWORK_REFUSED` guidance (Tailscale or DEC-012 setting), within DEC-011/012 | NAS-34, NAS-35 |
| AR-009 | M-9: invite = `{ nodeId, addressCandidates, inviteCode }`; `PeerAddressResolver` on both sides; typed invite `abpi_…` between desktops; re-pairing updates unpaired rows | NAS-19 |
| AR-010 | M-10: 403 Host rule; `nodeUpdateClient` Modify; no code in logs; `LOCAL_DEV_ONLY` removed; `node-access/domain` a leaf, resolver wired in the composition root | — |

Residual-risk note from the report adopted: timestamps earlier than process start are refused (M-7).

## Documents

`/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/`: `design-spec.md`, `requirements-doc.md`, `investigation-notes.md` (Round 2 Evidence), `solution-revision-record.md` (SR-005), `follow-ups.md`; contract `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-15, NAS-01…NAS-38).

## Route

`get_handoff_rules`: `Architecture Design Complete`, Large/High → `/software_engineering_team/architecture_reviewer`.
