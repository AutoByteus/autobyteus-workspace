# IR011 — integrated repository checks and limits

## Scope and decision

DR001 is an implementation-owned integration Local Fix, not another product
acceptance cycle. Fresh fetch still selected personal 5096011674; development
merge a4afd758a9766274b08f675c04952b19913fff0c has parents 4f44d115 and 5096011674.
The only unmerged path was the workspace REST test. The two non-ticket paths
changed on both branches were that test and file_explorer.md.

Base 4c373495 fixes **its route-only, per-test** harness. Its private fixture
removal is not appropriate for this ticket's composed, suite-scoped runtime.
Keep the latter: beforeAll composes process authorities/listeners; afterEach
calls public removeRegisteredWorkspace for newly registered owned workspaces;
afterAll closes the app before removing its data. The public removal method
checks its guard, closes matching active workspaces, deletes their map entries,
and deletes the registry entry. New assertions read both public boundaries to
prove removal. No private-map cleanup or per-test app.close is mixed in.

The existing helper is unchanged. buildStudioServer's onClose stops application
runtime then closes process supervisor, MCP host, event pipeline, definition
feed/services, secret vault and Prisma through existing authorities. Its one
base change wires delegatedLaunchSelectionService into composition, not cleanup.
The adjacent base file-explorer change returns relative search paths/removes old
unused traversal methods. Current source still uses the same workspace removal
owner and helper. The supplementary search/read and explorer checks cover this
nearby integration, not a new application gate.

All SIX test bodies, including the real socket HTTP/GraphQL journey and five
exact bytes/MIME/containment controls, are byte-identical to the ticket input.
The sole authored test delta is six additions/two deletions: public cleanup
assertions, lifecycle comment, removal of unused async and a blank line.
The auto-merged docs retain the exact IR010 draft section plus personal's
workspace-relative search/path documentation. No IR009 NFS source, engine,
IR010 production source, or test-server helper changed.

## Execution

Read current TESTING.md, DESIGN.md, root/server AGENTS and relevant helper/setup.
Clean archived integrated tracked source (excluding only tickets evidence),
private HOME/TMPDIR, clean environment, no credentials, provider gates or user
application data. Fresh frozen-lockfile installation selected Brief Studio's
workspace dependency closure (10/13 packages), not unrelated web/iOS surfaces.
Built current shared/server/SDK/devkit/Brief Studio prerequisites in scratch.
No old dist tree or previous candidate was used as source proof. All 7,330
non-ticket tracked files matched the integrated worktree after execution.

Exact argv/cwd, times, exit statuses: checks-result.json and both runner scripts.

| Local check | Result |
| --- | --- |
| Filtered frozen pnpm install | exit0 |
| test:integration:prepare (includes server build/shared prebuild/Prisma) | exit0 |
| Server production typecheck | exit0 |
| Resolved workspace REST fixture | 1 file / 6 assertions-based cases, exit0 |
| Workspace unit tests | 9 files / 48 tests, exit0 |
| File-explorer in-process integration + adjacent search/content HTTP fixture | 2 files / 12 cases, exit0 |

66 tests across 12 files. These are narrow implementation-local checks using
existing repository tests; **not an API/E2E sign-off or fresh filesystem/product
confidence score**. Broader suites, UI/editor, VM/Docker NFS campaign, physical,
independent-client, cross-OS and publication qualification were not run.
No integration evidence requires repeating API008's command-only campaign.

## Attempts, warnings and cleanup

- Expected initial merge exit1/conflict retained in merge-attempt.log; deliberate
  resolution committed, no remaining merge in progress. No test failure hidden.
- Two exploratory reads used incorrect guessed paths (bootstrap composition and
  env-isolation); corrected to compositions/build-studio-server.ts and
  tests/setup/test-environment-isolation.ts before execution. A find of absent
  tests/integration/workspaces was corrected to actual directories. No source or
  test command changed because of these read-only lookup errors.
- Install warns about not-yet-built devkit bin, initial Prisma default schema,
  and ignored @google/genai build scripts under existing allowlist. The normal
  prepare command explicitly generates Prisma, builds devkit and invokes its
  actual CLI path; it passes. No package-policy relaxation. Normal experimental
  SQLite and expected negative path-access diagnostics are retained.
- Raw command logs are preserved, including formatting whitespace; they are
  evidence, not hand-edited source. See final-checks.json for whitespace scope.
- Owned scratch/builds/private cache/test database removed after success; no
  surviving owned process found. All 309 old candidate/dist files unchanged.
  Five old dist trees untouched. cleanup.json records exact owned path.

API008 Pass95% and CRR015/016 Pass remain upstream, scope-limited results.
CR-FUP002 remains the existing nonblocking PM Task, not repaired/retested here.
DR001 remains Delivery's last recorded verdict until its owner resumes.
