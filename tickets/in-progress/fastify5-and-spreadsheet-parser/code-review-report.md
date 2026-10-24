# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (via the design spec and handoff)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `evidence/SD-06`, `SD-07`, `SD-09` (as cited by the design); `follow-ups.md`
- Relevant Solution Revision IDs: SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, `Pass`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation Engineer, IR-001 ready for source review
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A
- Reviewed code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`, branch `codex/fastify5-and-spreadsheet-parser`, `ddd6fdcdf6..2efacb42ea` (commits `195db3c42e`, `bbd88fd3ea`, `5c7ab7426c`, `29aeb5d721`)
- Reviewer evidence: `code-review-evidence/CRR-001-probes.txt` (P1 gateway build context, P2 non-MCP CORS headers on Fastify 4 vs 5)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. There are 13 non-lockfile files in the three named owners plus two lockfiles. No new owner, API or persistence. Risk stays High: a framework major sits under every request, the gateway's install and deployment path changes, a dependency comes from a non-npm host, and two security boundaries change.

## Review Scope

- Changed implementation and behavior reviewed: all non-lockfile changes in the four commits; root lockfile package-key changes per commit; gateway lockfile presence and settings (via IMP-10/IMP-18 evidence); the listener integration test change.
- Files / areas reviewed:
  - Server: `package.json`; `src/api/graphql/index.ts`; `src/agent-tools/mcp/agent-tools-mcp-routes.ts`; `src/mcp-gateway/mcp-gateway-routes.ts`; `tests/integration/application-backend/studio-agent-tools-listener.integration.test.ts`.
  - Read for context: `build-studio-server.ts` cors options; `build-standalone-application-server.ts`; `start-standalone-application-host.ts` L286-287; `runtime-logger-bootstrap.ts` L176-186; the devkit's consumers of `handle.url`.
  - Gateway: `package.json`, `pnpm-workspace.yaml`, `docker/Dockerfile`, `README.md`. Read for context: compose files, `src/config/runtime-config.ts` L66-68 and L160-181, `.gitignore`, the root `.dockerignore`.
  - Web: `package.json`, `ExcelViewer.vue`, `__tests__/ExcelViewer.spec.ts`, `docs/content_rendering.md`.
  - Root `pnpm-lock.yaml`.
- Explicit exclusions:
  - The gateway lockfile's resolved tree. It was reviewed through IMP-10 (frozen install, 268 tests, audit clean) and not line by line.
  - Server E2E and live journeys (left to API/E2E).
- Checks not rerun: IMP-01..IMP-19 are recorded with evidence and nothing they exercise changed afterwards. I spot-checked IMP-08, IMP-10, IMP-11, IMP-12 and IMP-13. I ran two new probes (P1, P2) for candidates no recorded check covered.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. These are SR-004, DEC-001 (GraphiQL off), DEC-002 (SheetJS 0.20.3 tarball, integrity-pinned), DEC-003..DEC-006 and DEC-008 (hyperlinked cells as text).
- Design-spec behavior map verified against the implementation: Yes, DS-001..DS-006.
- Design review report and round confirmed: ARCH-REV-002, round 2, `Pass`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Ranges moved, composition files unchanged. The logger option stays an options object (`getFastifyLoggerOptions` returns `{level, stream?}`, valid for Fastify 5's `logger`). No v5-removed request/reply API is used (grep; `request.context` hits are domain run requests, not Fastify). IMP-07/09/11/15/17/19 | — |
| BEH-002 | Confirmed | `registerGraphql` keeps schema, path, `subscription: true` and context. The WebSocket ack is in IMP-17 | — |
| BEH-003 | Confirmed | `graphiql: true` deleted, no flag; `/graphiql*` returns 404 (IMP-17, IMP-19) | — |
| BEH-004 | Confirmed | Both `{ config: { cors: false } }` removed. IMP-06 vs IMP-08 show no difference | — |
| BEH-005 | Confirmed | Multipart registration unchanged (`limits.fileSize`); the live limit journey is for API/E2E (AC-006) | — |
| BEH-006 | Confirmed (with CR-001) | Gateway workspace file, lockfile, `packageManager`, Dockerfile installing from the gateway files only; the root lockfile is untouched by `5c7ab7426c` (IMP-10) | CR-001 concerns what the now-working image also copies, not the install path |
| BEH-007 | Confirmed | `sheet_to_html(sheet, {header:'', footer:''})` → `DOMPurify.sanitize` with the design allowlist and `ALLOW_DATA_ATTR: false`. Both entry forms are unchanged (`type:'array'` for URL bytes, `type:'string'` for content). Loading, error, Retry and tabs are untouched | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001..SCN-004 | BEH-001..BEH-005 | System | Desktop app, phone, peers, agent MCP clients | Use the server | REST/WS/GraphQL/MCP | Normal | DS-001..DS-003 | Same responses | Requirements doc | Supported Normal Scenario | Use |
| SCN-005 | BEH-006, REQ-008, AC-010 | Operational | Gateway operator | Run the gateway in Docker, following the README's "Docker (recommended for always-on gateway)" section | `cp docker/.env.docker.example docker/.env.docker`, set secrets, then `docker compose -f docker/docker-compose.yml up -d --build` (README L38-56). Compose: `context: ../..`, `env_file: .env.docker`, volume `../memory:/app/autobyteus-message-gateway/memory` | Normal | DS-005: compose build (repo-root context) → Dockerfile `COPY autobyteus-message-gateway/ ./` → image → container with `env_file` secrets at runtime; personal-session state written to `memory/` on the host volume | Image builds and starts; secrets are supplied at run time through `env_file` | README; compose files; `.gitignore` treats `.env*` and `memory/` as never-committed operator data | Supported Normal Scenario | Use |
| SCN-006 | BEH-007 | User | Desktop/phone user | View a spreadsheet; a crafted file is an explicit edge case | File viewers | Normal + Explicit Edge | DS-006 | Sanitised table | Requirements doc | Supported Normal / Explicit Edge | Use |
| SCN-CR-01 | BEH-001 (devkit) | Dev | App developer | Start a standalone app host | `autobyteus-app dev` / `start` | Normal | `start-standalone-application-host.ts` L287 `listen()` → `handle.url` → devkit prints it and opens the browser | Printed URL reachable | `dev.ts` L29 default `listen-host` is `127.0.0.1` | Supported Normal Scenario (default host unchanged); wildcard host only on explicit flag | Use (for C-03) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The gateway image bakes the operator's `docker/.env.docker` (or `.env.docker.wechat-personal`) and the host `memory/` folder into an image layer | SCN-005; REQ-008/AC-010; the README's runtime-only secret delivery (`env_file`) | The operator follows the README Docker quick start (`up -d --build`). Any later rebuild after the gateway has run also includes `memory/` | Root context → root `.dockerignore` excludes neither `**/.env*` nor `autobyteus-message-gateway/memory` → `COPY autobyteus-message-gateway/ ./` (Dockerfile L25) puts `/app/autobyteus-message-gateway/docker/.env.docker` (server shared secret, admin token, webhook secrets) and `memory/` (WhatsApp/WeChat personal session state) into the image. The runtime volume masks `memory/` but not the layer. Anyone who gets the image (registry push, `docker save`, a shared host) gets the secrets and session | P1 in `code-review-evidence/CRR-001-probes.txt`: with the repo's `.dockerignore`, both dummy files are in the layer. On base the build failed before this COPY (SD-03), so no image ever held them; this ticket's change makes the image real. IMP-18 used a clean clone, which has neither file | Promote | This ticket (the change exposes it, in the file the change rewrote) | Bounded packaging fix: the image must not contain operator env files or runtime data from the build context (CR-001) |
| C-02 | Fastify 5 + `@fastify/cors` 11 could change CORS headers on non-MCP routes (the renderer and phone call `/graphql` and `/rest` cross-origin) | REQ-002, SCN-001/002 | Renderer/phone request with `Origin`, including preflight | Studio cors plugin `origin: true`, explicit `methods` → headers | P2: preflight and simple requests on `/graphql` and `/rest/health` are identical on 4.29.1+9.0.1 and 5.12.7+11.3.1 | Reject | — | No difference; nothing to fix |
| C-03 | `listen()` returns `http://127.0.0.1:<port>` instead of `http://0.0.0.0:<port>` for a wildcard bind (IMP-13); the standalone host returns it as `handle.url` | SCN-CR-01 | Developer passes `--listen-host 0.0.0.0` explicitly | Devkit prints the URL and opens the browser with it. The default host is `127.0.0.1` (`dev.ts` L29), so the default output is unchanged | `start-standalone-application-host.ts` L287; devkit `start.ts` L48, `standalone-development-session.ts` L63-68 | Reject | — | Not an HTTP status, header, payload, classification or auth contract. The new URL is reachable and arguably more usable. No consumer treats it as the bind address |
| C-04 | The listener integration test change could weaken its assertion | REQ-002 (MCP gateway gate) | — | The test still asserts `mainAddress.address === "0.0.0.0"` (L48) and now builds the non-loopback-Host URL from it (L63), keeping the 401 assertion | Diff; IMP-13 | Reject | — | Intent preserved; the address is guaranteed IPv4 by the preceding assertion |
| C-05 | Gateway Dockerfile keeps `WORKDIR /app/autobyteus-message-gateway`, which the design listed for removal | DS-005; BEH-006 | — | The compose volumes mount `/app/autobyteus-message-gateway/memory`. The default runtime data root is `<cwd>/memory` (`runtime-config.ts` L66-68, L174-181). `WORKDIR /app` would move data off the volume | Read | Reject (deviation confirmed correct) | — | Behavior-preserving; the install still reads only the gateway's three files (DS-005 holds) |
| C-06 | The viewer spec runs under jsdom instead of happy-dom | REQ-012, AC-013 | — | Under happy-dom 15, DOMPurify stops after its first removal (IMP-04); jsdom and Chrome match (IMP-04, IMP-14). The mutation check without the sanitiser fails 2 cases (IMP-03) | Evidence | Reject (deviation confirmed correct) | — | The production code equals the design example; FU-006 covers the test DOM |
| C-07 | DOMPurify keeps `aria-*` attributes by default (`ALLOW_ARIA_ATTR`), outside the table allowlist | REQ-011 | — | Reaching it needs cell content to inject an attribute, which 0.20.3 escapes (IMP-01, SD-05); SheetJS itself emits no `aria-*` | Read | Reject | — | Not reachable; no script path even if it were |
| C-08 | The pinned DOMPurify 3.4.7 has critical GHSA-cg2g-xh64-v4q7 | REQ-011 | — | Requires `SAFE_FOR_TEMPLATES` + a DOM-returning mode + a shadow-root input; no web call site uses those options (grep) | IMP-12 (present on base, not added); advisory text | Promote | Follow-up (FU-007) | Pre-existing, not reachable, explicitly out of scope ("other dependency advisories") |
| C-09 | Root lockfile scope | Design Risks ("review that the diff only moves the intended packages") | — | `195db3c42e`: only `xlsx` 0.18.5 and its 7 deps removed, the tarball entry added with `integrity: sha512-oLDq3jw7…`. `bbd88fd3ea`: only the fastify/mercurius/`@fastify/*` trees and their transitive packages (avvio, light-my-request, find-my-way, undici 5, busboy, mqemitter, send/static deps, ajv-formats 2), plus the Apollo/graphql-codegen snapshot keys' optional peer id. `5c7ab7426c`: root lockfile untouched | `git show <c> -- pnpm-lock.yaml` key diff | Reject | — | Matches the handoff's claim |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Bounded edits in existing owners; no refactor | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining; it matches the design examples except the two confirmed deviations (C-05, C-06) | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001..DS-006 preserved; registration order unchanged | — |
| Ownership boundary preservation and clarity | Pass | Each edit stays in its owner (`registerGraphql`, MCP route files, gateway packaging, `ExcelViewer.vue`) | — |
| Off-spine concern clarity | Pass | DOMPurify serves `ExcelViewer.vue` directly; no wrapper layer | — |
| Existing capability/subsystem reuse check | Pass | Reuses the pinned DOMPurify; the gateway follows the sidecar's own-lockfile idea | — |
| Reusable owned structures check | Pass | None needed | — |
| Shared-structure/data-model tightness check | Pass | No shared structure changes | — |
| Repeated coordination ownership check | Pass | — | — |
| Empty indirection check | Pass | None added | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Fail | The gateway Dockerfile copies the whole package folder, including operator env files and runtime data (CR-001) | CR-001 |
| Ownership-driven dependency check | Pass | Root workspace ↔ gateway separation held (IMP-10); web depends on `xlsx` only via the tarball URL | — |
| Authoritative Boundary Rule check | Pass | No caller bypass introduced | — |
| File placement check | Pass | Workspace and lock files at the gateway package root | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Only `/graphiql*` removed | — |
| Naming quality and naming-to-responsibility alignment check | Pass | `tableHtml`, `wildcardMainUrl` are clear; no new domain words | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | Single-pass edits | — |
| Dead code removed in the touched files and modules | Pass | `graphiql`, both `cors: false`, `id`/`editable`, the `xlsx` mock, and the Dockerfile's root-workspace and `autobyteus-ts` lines removed | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The spec covers AC-012/AC-013 case by case. The hyperlink test asserts the precondition that the parser emits the links. The mutation check proves the sanitiser cases bite (IMP-03) | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `book`, `serve`, `mountWithUrl`, `cellTexts` helpers; generated fixtures only | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The mock-based tests were replaced | — |
| API/E2E readiness for the next workflow stage | Fail | AC-010 must be validated on the corrected image (CR-001) | CR-001, then API/E2E |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/viewers/ExcelViewer.vue` | 232 | 238 | Pass | Pass (+6) | Pass | Pass | — | — |
| `autobyteus-server-ts/src/api/graphql/index.ts`, `agent-tools-mcp-routes.ts`, `mcp-gateway-routes.ts` | — | −1 line each | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-message-gateway/docker/Dockerfile` | ~27 | ~27 | Pass | Pass | Fail (CR-001) | Pass | Local Fix | CR-001 |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No GraphiQL flag, no type augmentation, no fallback parser |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | See above |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected` |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done in this change)
- Why: the gateway install model changed; the viewer's parser and sanitisation changed.
- Files or areas affected: `autobyteus-message-gateway/README.md` (Install section; `approve-builds` note reconciled), `autobyteus-web/docs/content_rendering.md`. If the CR-001 fix changes what the image contains, the README Docker section needs no change, because secrets still come from `env_file`.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV premises (AR-001 hyperlink cells; DS-005 Docker path) | Confirmed | DS-005's install path is confirmed. C-01 adds a premise the design did not cover: what the final COPY carries |

### `CRP-001` — The gateway image carries operator secrets and session state from the build context

- Origin: `New`
- Related approved requirement or established contract: REQ-008/AC-010 (the image this ticket delivers); BEH-006. The README's Docker contract: secrets are set in `docker/.env.docker` and delivered at run time through compose `env_file`. `.gitignore` treats `.env*` and `memory/` as operator-only data.
- Relevant behavior ID(s): BEH-006
- Coherent product goal or governing event: an operator runs the gateway in Docker as the README recommends.
- Scenario validity: `Supported Normal Scenario`
- Initiating basis kind: `Operational`
- Independent trigger: README L38-56 (`cp docker/.env.docker.example docker/.env.docker`, set secrets, `docker compose … up -d --build`).
- Support evidence: README Docker section; `docker-compose.yml` L7-14 (`context: ../..`, `env_file: .env.docker`, volume `../memory`).
- Forward path: compose build with the repo-root context → root `.dockerignore` (no `.env*` or `memory` rule) → Dockerfile L25 `COPY autobyteus-message-gateway/ ./` → image layer holds `docker/.env.docker`; after the first run, rebuilds also hold `memory/` (the volume's host path is inside the context).
- Lifecycle preconditions and material consequence: the image exists only since this ticket fixed the build (SD-03 base failure). Its layers carry the server shared secret, admin token, webhook secrets and WhatsApp/WeChat personal session credentials to anyone who obtains the image.
- Reachability: `Reachable` (P1)
- Review consequence / proportionate response: CR-001, a Local Fix in the Dockerfile (or a Dockerfile-specific ignore file). No new behavior.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.2
- Overall score (`/100`): 92
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001..DS-006 preserved exactly; registration order untouched | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Each edit stays in its owner; the template reads only the sanitised value | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Only `/graphiql*` removed, as DEC-001 decides | — | — |
| `4` | `Separation of Concerns and File Placement` | 8.5 | Gateway files at the package root; the viewer owns its sanitiser | The Dockerfile's final COPY takes the whole package folder (operator data, tests, tickets, tools) instead of the build inputs (CR-001) | Copy only what the build needs, or exclude operator data |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | No shared structure touched | — | — |
| `6` | `Naming Quality and Local Readability` | 9.5 | Clear comments explain the jsdom choice, the WORKDIR and the sanitiser | — | — |
| `7` | `API/E2E Readiness` | 8.5 | Server, web and lockfiles are ready; the handoff lists the remaining journeys precisely | AC-010 would validate an image that leaks operator secrets | Fix CR-001, then rebuild and show `/health` |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.5 | MCP and non-MCP CORS identical (IMP-08, P2); GraphQL, WebSocket and GraphiQL 404 shown; the viewer sanitises in Chrome and jsdom | CR-001: the delivered gateway image carries secrets and session state | CR-001 |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean cuts: no flag, no augmentation, no fallback parser | — | — |
| `10` | `Cleanup Completeness` | 9.5 | All of the design's removals done | — | — |

## Findings

### CR-001 — The gateway Docker image bakes the operator's env file and runtime session data into its layers

- Severity: blocking (security; introduced in effect by this change)
- Candidate / premise: C-01, CRP-001
- Protects: REQ-008/AC-010 (the image this ticket makes buildable), BEH-006, and the README's runtime-only `env_file` secret contract
- Location: `autobyteus-message-gateway/docker/Dockerfile` L25 `COPY autobyteus-message-gateway/ ./`. The root `.dockerignore` has no rule for `**/.env*` or `autobyteus-message-gateway/memory`.
- Evidence: P1 in `code-review-evidence/CRR-001-probes.txt`. With the repo's own `.dockerignore`, `./docker/.env.docker` and `./memory/whatsapp-personal/creds.json` land in the image. The README's Docker quick start puts secrets in `docker/.env.docker` inside this folder, and compose mounts `../memory` (also inside the build context). At base the build failed before this COPY (SD-03).
- Required action (outcome, not mechanism): the gateway image contains no operator env files (`docker/.env.docker*`, `.env*`) and no runtime data (`memory/`) from the build context. Either copy only the build inputs (`tsconfig.json`, `tsconfig.build.json`, `src/`, plus anything the runtime reads), or add a Dockerfile-specific ignore file (`autobyteus-message-gateway/docker/Dockerfile.dockerignore`) excluding them. The first also drops `tests/`, `tickets/` and `tools/` from the image. Keep `WORKDIR /app/autobyteus-message-gateway` and the three-file frozen install.
- Proof expected: a build from a tree that holds dummy `docker/.env.docker` and `memory/…` files shows neither in the image (e.g. `docker run --rm <img> find . -name '.env*' -o -path ./memory -print`), and the IMP-18 health check still returns 200. Use dummy values only.

## Follow-ups

- Follow-ups this review added: FU-007 (DOMPurify 3.4.7 critical advisory, not reachable with current options; pre-existing).

## Classification

- `Local Fix` (implementation-owned): CR-001, a bounded packaging correction within DS-005. No requirement or design change is needed: the design's dependency rule still holds ("The gateway Docker build reads only the licence files and `autobyteus-message-gateway/`").

## Recommended Recipient

- Implementation Engineer (Local Fix), the recipient `get_handoff_rules` returns for a failed implementation review.

Routing note:
- After the fix: source review (targeted delta on the Dockerfile) and then API/E2E.

## Residual Risks

- RSK-001: Fastify 5 run-time differences outside the suites. The server E2E folder and the AC-006/AC-007/AC-014 journeys are with API/E2E. P2 adds evidence that non-MCP CORS is unchanged.
- RSK-002: `cdn.sheetjs.com` is needed on a cold install. It is integrity-pinned, and anyone regenerating the root lockfile must check that the `xlsx` entry still carries `integrity` (handoff Environment notes).
- RSK-003: the gateway's `libsignal` git tarball is pinned by commit, with no integrity field.
- Hints for API/E2E:
  - the standalone host with `--listen-host 0.0.0.0` (prints a `127.0.0.1` URL);
  - an AC-004 probe of `GET /graphiql` from a non-loopback address.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (CRP-001 reachable and supported)
- Score Summary: 9.2/10. Categories 4, 7 and 8 are at 8.5 because of CR-001.
- Failure Origin: N/A
- Recommended Recipient: Implementation Engineer (Local Fix, CR-001)
- Notes: everything else reviewed is ready, with no other finding. That covers the server move, GraphiQL removal, MCP config removal, the viewer, the lockfile scope and both deviations. The re-review after the fix will be a targeted delta on the gateway Dockerfile (or its ignore file).
