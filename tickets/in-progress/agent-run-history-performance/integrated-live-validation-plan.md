# Integrated Live Validation Plan — Agent Run History Performance

## Status

`Design-ready validation supplement` — 2026-07-20. Approval applicability: `N/A`; this artifact defines evidence collection and data-safety procedure, not new user-visible behavior.

## Purpose And Scope

Validate the approved Event Monitor optimization and active-trace earlier-browsing refinement with one internally consistent candidate: the integrated frontend, the integrated backend containing the active-only/newest-100 provider and fixed-50 active-trace page boundary, and a consistent disposable snapshot of the representative `/home/autobyteus/data` dataset.

This plan separates:

1. remote-node/window bootstrap and catalog/workspace readiness;
2. Event Monitor row-selection projection time;
3. frontend hydration and usable-render time;
4. one first and one continuation active-trace earlier-page request; and
5. final latest/browse payload, state, and DOM bounds.

It must never permit two server processes to own the same writable live data directory.

Related authority: `REQ-001`–`REQ-003`, `REQ-009`–`REQ-012`; `AC-001`–`AC-003`, `AC-008`–`AC-010`, `AC-012`–`AC-015`. The user-visible UI/UX remains defined by `history-window-ui-ux-spec.md`.

## Verified Mismatch Behind The Reported Slow Attempt

| Boundary | Process / artifact | Data root | Provider behavior | Consequence |
| --- | --- | --- | --- | --- |
| Remote node selected by the user | PID 45, `/app/autobyteus-server-ts`, port 8000 | `/home/autobyteus/data` | Compiled provider has `includeArchive: true`; no compiled recent projection policy | Reads/reconstructs/transports archive-scale history before the frontend can bound it |
| Integrated Electron backend | PID 17730, packaged server, port 29695 | `/root/.autobyteus/server-data` for AppConfig/DB/run-history | Compiled provider has `includeArchive: false` and `selectRecentReplayEvents` | Contains the optimization but did not serve the user's large remote dataset |
| Integrated Electron frontend | Packaged renderer | Bound to the user-added port-8000 node for the attempted view | Receives the old backend's unbounded response | Still pays transport and `dedupeProjectionEntries` work before final client enforcement |

The old port-8000 backend and the integrated frontend are therefore a mixed-version topology. It is useful evidence that a frontend cap cannot repair an old server, but it is not a valid acceptance run for `AC-001`, `AC-002`, `AC-008`, or `AC-009`.

The `marketing_team_17621f4388b8404b93fed82bda622d87` source currently has two projected members. Their active files total 658,743 bytes while their 17 archive segments total 31,960,167 bytes. The old active-team path requests every member projection concurrently; each old provider may read its complete archive corpus. Existing evidence for the larger member shows a 47,537,621-byte response with 1,725 conversation entries and 794 Activity entries, followed by about 27.9 seconds in the legacy quadratic frontend dedupe benchmark. This is sufficient to explain why the mixed-version path can remain very slow even though the final new feed mounts no more than 100 events.

The node-bound renderer was created at `2026-07-20T08:43:36.538Z`; the eventual-success screenshot was written 212.893 seconds later. Because no row-click/request markers were captured, 212.893 seconds is only a combined upper bound. It cannot distinguish node bootstrap/catalog/workspace time from projection/network/hydration time.

## Safety Invariants

1. `/home/autobyteus/data` has exactly one writable server owner during snapshot creation.
2. Do not aim the integrated backend at `/home/autobyteus/data` while the port-8000 process is running.
3. Do not create a “consistent” snapshot by ordinary recursive copy while the source server can mutate SQLite, indexes, metadata, or active traces.
4. Preferred snapshot source is a storage-level atomic snapshot if the host provides one. No such facility has been demonstrated for the current ext4 Docker volume, so the executable fallback is a coordinated brief stop/quiesce of the old server.
5. The validation backend owns only a uniquely named disposable snapshot directory and an isolated loopback port.
6. Explicitly bind every data-root environment variable. Do not inherit `AUTOBYTEUS_MEMORY_DIR`, `AUTOBYTEUS_DATA_DIR`, `DATABASE_URL`, or `AUTOBYTEUS_LOG_DIR` from the parent shell. The currently packaged child process inherited a stale `AUTOBYTEUS_MEMORY_DIR` value even though AppConfig run-history resolves from `--data-dir`; a validation proof must remove that ambiguity.
7. Use `AUTOBYTEUS_SKIP_SYNC=1`; do not execute agents, submit messages, compact memory, or otherwise treat the snapshot as production data.
8. Prefer running the integrated server and all descendants under a path-only file-open audit for the complete validation lifetime. This audit is required in Mode R. If it, command/environment checks, startup logs, or file-descriptor inspection shows validation-process access to `/home/autobyteus/data`, abort immediately. If runtime tracing is unavailable, only the explicit Mode S limited-evidence fallback below is permitted.
9. Choose and record exactly one live-owner mode before copying:
   - **Mode S — stopped owner:** the old server remains stopped through validation. Live-source before/after equality is required.
   - **Mode R — restarted owner:** the old server may restart only after quiesced source-to-snapshot equality is established. Its legitimate later live-source writes are recorded but never treated as a validation failure; validation non-access and snapshot raw-trace immutability remain required.

## Safe Topology

```text
live old server :8000 ──exclusive──> /home/autobyteus/data
                                      │
                         coordinated quiesce/atomic snapshot
                                      ▼
integrated server :<isolated> ─────> /tmp/autobyteus-history-validation-<id>/server-data
          ▲
          │ remote-node binding
integrated Electron frontend
```

The old server may be restarted against the live directory after the snapshot is complete. It may then run concurrently with the integrated validation server because the latter owns a physically separate snapshot.

## Execution Procedure

### Phase 0 — Record Candidate Identity

Record without raw payloads:

- ticket branch/commit and integrated base;
- Electron package SHA-256;
- frontend artifact path;
- integrated server entrypoint path and SHA-256;
- compiled provider evidence showing `includeArchive: false`;
- compiled recent policy presence;
- old port-8000 PID/cmdline/provider evidence showing the mismatch;
- target team/run/member identities and source active/archive byte counts.

### Phase 1 — Create A Consistent Disposable Snapshot

1. Obtain explicit operator approval for a brief port-8000 quiesce, unless an atomic storage snapshot is available.
2. Stop/quiesce the old server and verify no remaining process has writable file descriptors under `/home/autobyteus/data`.
3. Create a new mode-0700 destination such as `/tmp/autobyteus-history-validation-<id>/server-data`.
4. Copy the complete data root with metadata preservation. Do not reuse `/root/.autobyteus/server-data` and do not overlay an existing profile.
5. While the source is still quiesced, record aggregate file counts/bytes and SHA-256 for the target run's active trace, archive segments, manifest, metadata, and SQLite database on both source and snapshot; require equality.
6. Record the chosen mode. In Mode S, leave the old server stopped. In Mode R, restart it against `/home/autobyteus/data` only after the equality check completes, record its new PID/start time, and treat later live-source hash/mtime changes as non-attributable informational evidence rather than a validation gate.

If the old server cannot be quiesced and no atomic snapshot exists, mark realistic validation `Blocked` with that exact dependency. Do not weaken the safety invariant.

### Phase 2 — Start The Integrated Backend In Isolation

Use the packaged integrated server artifact, not `/app/autobyteus-server-ts`. Start it on an unused loopback port with an explicitly constructed environment and a path-only open audit covering the server and all descendants for their full validation lifetime:

- `AUTOBYTEUS_DATA_DIR=<snapshot>`
- `AUTOBYTEUS_MEMORY_DIR=<snapshot>/memory`
- `DATABASE_URL=file:<snapshot>/db/production.db`
- `AUTOBYTEUS_LOG_DIR=<snapshot>/logs`
- `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:<isolated-port>`
- `AUTOBYTEUS_SKIP_SYNC=1`
- explicit `PORT`/`SERVER_PORT`
- `--host 127.0.0.1 --port <isolated-port> --data-dir <snapshot>`

Unset inherited variants before applying those explicit values. Wait for `/rest/health`, retain startup timing, and verify effective AppConfig data/memory/DB/log paths. Inspect `/proc/<pid>/cmdline`, `/proc/<pid>/environ`, and `/proc/<pid>/fd`; none may reference `/home/autobyteus/data`.

On Linux, the preferred audit is to launch the server under an available syscall tracer such as:

```text
strace -ff -ttt -s 4096 -e trace=open,openat,openat2 \
  -o <evidence-dir>/validation-file-open <integrated-server-command>
```

The retained audit contains timestamps, process IDs, paths, flags, and return codes only; it must never capture `read`/`write` buffers or GraphQL bodies. Record a trace-ready marker before bootstrap and wall-clock request-start/response-complete markers around the target request. This provides both a full-lifetime assertion of zero `/home/autobyteus/data` opens and a request-bounded assertion for active/archive raw-trace paths. If the platform uses another path-opening syscall, add it explicitly before execution rather than claiming incomplete coverage.

If a path-only runtime open audit cannot be installed or attached with sufficient permission, Mode R is `Blocked` because validation-process access cannot be separated from legitimate activity by the restarted live owner. Mode S may still execute the performance/bound scenarios with the old owner stopped, but `OPEN-001` and independent `AC-001` no-open re-proof must be marked `Not Executed — tracer unavailable` and the prior durable instrumented API/E2E scenario must be cited instead. Response sentinel exclusion may still be checked, but it must not be described as proof that no transient archive or live-root open occurred. Command/environment/FD checks remain configuration evidence, not an absolute transient-open proof; lack of a tracer does not relax those checks, snapshot integrity, or Mode S live-source equality.

### Phase 3 — Measure Bootstrap Separately

Open a fresh integrated node-bound window connected to the isolated server **without selecting the target run first**. Capture monotonic markers for:

1. window creation requested;
2. renderer document ready;
3. node health accepted;
4. agent/team catalog visible and selectable; and
5. shell/composer controls interactive.

Record request-level timings for health, catalog, workspace, definition, and resume/status calls. Report cold first run and at least two warm runs. This phase ends before the target row projection begins.

### Phase 4 — Measure Row Selection And Projection

For `marketing_team_17621f4388b8404b93fed82bda622d87` / `linkedin_marketer`:

1. Mark the exact click/selection time.
2. Capture every `getTeamMemberRunProjection` request triggered by that action, including the focused member and any active-team fan-out member.
3. For each request record connect time, TTFB, total time, HTTP status, encoded/decoded bytes, conversation entry count, Activity entry count, and newest/oldest stable event identity or timestamp without retaining content.
4. Independently issue the same GraphQL operation against the isolated backend with `curl --write-out` or an equivalent timing client to separate backend/transport from renderer work.
5. Confirm each normal projection contains no archive-only sentinel/event from the snapshot.
6. Confirm no returned conversation projection exceeds 100 canonical replay entries and final Activity state is at most 100.
7. From the request-bounded path-only audit, require at least one successful open of the target `raw_traces_active.jsonl` and zero opens whose canonical target path matches that run's archived raw-trace segments or `/home/autobyteus/data`. Preserve only the matching path/audit lines and aggregate counts. If the audit is unavailable, apply the explicit prior-evidence fallback from Phase 2 and do not claim this run independently passed `AC-001`'s no-open clause.

### Phase 5 — Measure Frontend Usability And Mounted Bound

Capture monotonic timestamps for:

1. selection click;
2. projection response complete;
3. hydration commit complete;
4. recent Event Monitor content visible;
5. composer focusable/usable; and
6. two animation frames after the final bounded render.

Record:

- click-to-first-content;
- click-to-composer-usable (the `AC-009` user-facing measure);
- response-complete-to-hydration-commit;
- hydration-commit-to-stable-render;
- mounted Event Monitor visual-event count;
- retained conversation visual count and Activity count;
- main-thread long tasks during hydration;
- console/page errors;
- cold run and at least two warm runs.

Use the same component/browser counting method already retained in API/E2E evidence so the value is comparable to the 100-row result and 965 ms usable time. Do not infer usability from a screenshot alone.

### Phase 5A — Measure Explicit Active-Trace Earlier Paging

After the latest view is stable, and only when the target active trace has at least 151 canonical replay events:

1. Capture the current first-visible event key and its offset in the Event Monitor scroll container.
2. Activate `Load 50 earlier` once. Record request operation/subject identity, TTFB, total, encoded/decoded bytes, `loadedEarlierCount`, returned event/visual counts, oldest/newest event IDs, visual-ID uniqueness, cursor status, and archive-path opens from the same request-bounded path-only audit.
3. Require the first browse response to represent one server-consistent active generation containing the latest 100 plus at most 50 immediately preceding events. Its generated schema/body contains only the closed typed central visual variants and no `GraphQLJSON`, raw result, logs, Activity detail/context, generic arguments, or archive-only sentinel.
4. After render, record click-to-control-ready, response-complete-to-stable-render, resident/mounted central visual count, event/visual-ID uniqueness, and first-visible `data-event-monitor-visual-key`/offset delta. Require the prior visual anchor to remain stable within documented browser/layout tolerance.
5. Activate `Load 50 earlier` a second time. Record the same metrics and require at most the immediately preceding 50 events, no gap/duplicate at the page boundary, unchanged generation, stable source-to-DOM visual keys, and a resident/mounted central visual count no greater than 300.
6. Require each explicit page interaction to become stable and usable within 2.0 seconds on the documented representative active source. The normal row-selection `USABLE-001` timing remains independent and must not include a speculative page request.
7. If the real representative active source cannot supply two earlier pages, record that limitation and execute the traversal/beginning/expiry/turnover behavior against the durable generated fixture required by `AC-012`–`AC-015`; do not weaken the representative latest-selection evidence. The generated fixture must include distinct equal-content/equal-timestamp events across a page boundary and a raw tool result containing a unique multi-megabyte sentinel. Compare the latter with a result-null equivalent while holding central fields/IDs constant: serialized central `events` bytes and rendered values must be identical (cursor/generation metadata excluded), the sentinel must be absent, and page conversion must remain linear/no-recursion.
8. During each page request, require an active-trace open and zero archive-segment/live-root opens when tracer coverage exists. Without tracer coverage, label the page archive-no-open clause not independently re-proved and cite prior durable instrumented page evidence under the same Mode S fallback; Mode R remains blocked.

`Beginning of current activity`, cursor expiry after an intentional fixture-only active rewrite, `Jump to latest` reset, and >500-event resident turnover are destructive/control-flow scenarios and must use a generated disposable fixture, not mutate the representative snapshot.

### Phase 6 — Preserve Evidence And Clean Up

- Retain aggregate timings, counts, byte sizes, hashes, exact commands, process topology, and screenshots.
- Do not retain raw GraphQL bodies or tool/conversation content.
- Stop the isolated validation backend and Electron test window.
- Verify no owned process remains and no process references the snapshot.
- When tracing was available, close the path-only audit and verify zero validation-process opens under `/home/autobyteus/data` for the entire captured lifetime. In the tracer-unavailable Mode S fallback, record `OPEN-001` as not executed rather than making this claim.
- Re-hash the snapshot target run's active trace, archive segments, and manifest; require equality with their pre-validation snapshot hashes.
- In Mode S only, re-hash the corresponding live-source files and require equality with their Phase 1 source hashes. In Mode R, record old-owner activity and report live-source equality as `N/A — writable owner restarted`; never fail validation because that owner legitimately changed its files.
- Delete the disposable snapshot only after evidence is complete and user verification does not require a rerun.
- Do not modify, archive, push, release, or finalize the ticket while the delivery hold remains active.

## Measurement Result Schema

| Metric ID | Start | End | Required evidence | Decision use |
| --- | --- | --- | --- | --- |
| `BOOT-001` | Window creation request | Catalog/shell selectable | Browser marks + request waterfall | Separates remote-node bootstrap from Event Monitor |
| `ROW-001` | Exact row click | All required projection responses complete | Browser network markers | Shows active-team fan-out critical path |
| `API-001` | Direct GraphQL request start | First response byte / complete | TTFB, total, bytes, status | Isolates integrated backend/transport |
| `HYDRATE-001` | Projection response complete | Hydration commit | Browser performance marks | Detects client conversion/dedupe cost |
| `USABLE-001` | Exact row click | Recent content visible and composer focusable | DOM/component assertions | Governs `AC-009` <=2.0 s |
| `BOUND-001` | Stable render | Count sampled | Payload/state/component/DOM counts | Governs newest-100 and mounted bound |
| `PAGE-001` | Each `Load 50 earlier` activation | Control ready and stable browse render | TTFB/total/bytes/event+visual IDs/cursor status, schema exclusion, linear conversion markers, DOM visual keys, anchor delta, path-only audit | Governs fixed-50 active-only paging, source-to-DOM identity, result/log exclusion, <=2.0 s interaction, no gaps/duplicates, and <=300 resident visuals under `AC-012`–`AC-015` |
| `COPY-001` | Quiesced source hash | Post-copy snapshot hash | Target active/archive/manifest/metadata/DB counts, bytes, hashes | Proves the snapshot started equal to the quiesced source |
| `OPEN-001` | Integrated process start / target request start | Process stop / target response complete | Full-lifetime and request-bounded path-only open audit; command/environment/FD audit | When tracer coverage exists, proves validation did not access the live root and directly re-proves archive no-open; otherwise `Not Executed`, Mode R is blocked, and Mode S relies on separately labeled configuration/integrity plus prior `AC-001` evidence |
| `SNAPSHOT-RAW-001` | Before integrated validation | After integrated validation | Snapshot target active/archive/manifest hashes | Proves the read-only validation did not mutate snapshot raw traces |
| `LIVE-SOURCE-001` | Quiesced source before copy | End of validation | Live target hashes/mtimes | Required only in Mode S; `N/A` in Mode R because the restarted legitimate owner may write |
| `OLD-OWNER-001` | Mode R restart | End of validation | Old-owner PID/start/activity record | Informational attribution boundary only; never a source-equality gate |

## Classification And Decision Gates

| Corrected observation | Classification | Routing |
| --- | --- | --- |
| All required acceptance evidence is satisfied by executed scenarios plus any explicitly cited prior durable `AC-001` evidence: integrated backend is active-only/newest-100; target row is usable within 2.0 s; explicit pages are active-only/fixed-50 and usable within 2.0 s; latest/browse bounds and applicable integrity/audit gates pass | Original slow attempt was a validation-topology mismatch, and the refined active-trace browsing contract passes | API/E2E engineer returns `Pass` with scenario IDs/evidence to code reviewer for proportional test-code review (`N/A` when no durable test changed), then code reviewer hands the passed package to delivery; delivery keeps the explicit user-verification hold |
| Any executed scenario fails, including slow bootstrap, slow integrated API/fan-out, fast API plus slow hydration, slow/incorrect page traversal, archive open, latest/browse bound violation, snapshot mutation, or validation live-root access | API/E2E `Fail`; likely origin is recorded as a hypothesis, not direct owner routing | Stop where safety requires; return first to code reviewer for focused failure-origin analysis with scenario IDs and exact execution context. Code reviewer classifies and routes Design Impact to solution designer, implementation-owned defects to implementation engineer, or API/E2E-owned test/environment/reporting issues to API/E2E engineer |
| Required quiesce/atomic snapshot, runtime privilege, fixture identity, package, service, or other dependency is unavailable and safe execution cannot continue | API/E2E `Blocked` | Report to the user with preserved evidence and the exact missing dependency; do not weaken safety or infer pass/fail |

## Current Solution Decision

The reported multi-minute attempt does **not** currently establish a requirement gap or a product-design failure. It did not exercise the integrated backend half of the optimization, and its 212.893-second observation lacks markers that separate window bootstrap from row projection and frontend hydration. The approved design already requires active-only/newest-100 behavior at the backend boundary and <=2.0-second usable content under `AC-009`; prior integrated isolated evidence passed those contracts.

The mixed-version observation alone proposes no production fix. The subsequently approved active-trace paging feature is a separate user requirement and is now included in representative measurement rather than treated as a remedy for the old port-8000 mismatch. After architecture and implementation-source review pass, `api_e2e_engineer` owns corrected isolated-snapshot execution. Every execution `Fail` returns first to `code_reviewer` for focused failure-origin classification; a `Pass` returns for proportional test-code review and then delivery; `Blocked` goes to the user with the exact missing dependency.
