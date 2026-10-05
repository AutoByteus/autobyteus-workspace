# Solution Design Best Practices

Read this before proposing or revising a solution, architecture, or refactor in
this repository. It complements [TESTING.md](TESTING.md): this file guides what
we design and why; the testing guide governs how we verify it.

**Design the smallest solution that satisfies supported product behavior and
real correctness/security obligations. Preserve guarantees, not accidental
implementation machinery.**

This guide does not approve new product behavior, replace the team's design
workflow, or authorize removing safeguards. Keep evidence, user-approved
requirements, and technical decisions distinct.

## Mandatory Design Rules

These rules apply to design and technical review. The sections below explain
how to apply them; they do not replace user-approved product requirements.

1. **Start with supported behavior.** Establish the normal path and required
   contracts before adding edge-case branches. Additional guards or layers need
   an independently supported product, security, integrity, or operational need.
   Do not front-load speculative performance or concurrency machinery.
2. **Do not couple fresh UUID allocation to historical collision scans.** Normal
   new-Org Agent identity generation must not read saved execution trees merely
   to prove each freshly generated UUID is unused. This does not govern resume,
   import, externally supplied identity, or unrelated admission checks.
3. **Justify critical-path dependencies and global work.** Selected-runtime
   verification must not wait for unrelated discovery. A new-row update must not
   trigger avoidable repeated full-history transfer and whole-workspace equality
   work. Legitimate initial loading/resynchronization is a distinct operation.
4. **Preserve guarantees, not machinery.** Keep required validation, security,
   data continuity, hierarchy, and concurrent-update freshness. Do not defend an
   existing mechanism solely because it was previously labeled “safety.”
5. **Remove unnecessary work before adding complexity.** Prefer deletion or a
   bounded change to the existing owner over speculative frameworks or caches.
   New owners/state must have concrete responsibilities and lifecycle semantics.
6. **Prove the result honestly.** Follow [TESTING.md](TESTING.md) and verify working
   user-visible functionality first. Add profiling/scaling/work-count evidence
   when performance is a demonstrated problem or an explicit requirement, not
   as a speculative optimization program. Retain failure/environment limits;
   an API timing does not prove UI readiness, and a pre-change installed binary
   does not validate changed source.

## Work in two phases: clean functionality, then evidence-led refinement

**Phase 1 — clean architecture and working functionality.** Start from the
approved normal workflow. Establish clear boundaries, data ownership and the
smallest necessary path to the result; make that functionality work and verify
it. Do not start by designing elaborate performance infrastructure, generalized
concurrency coordination, or exhaustive handling for imagined edge cases.
Large tickets need coherent functional slices, not a speculative framework.

**Phase 2 — use, observe, and refine.** Exercise the working product through real
supported journeys. Investigate actual failures, slow steps, or established
operational needs. Measure where needed, then make the smallest justified
refinement. Remove unnecessary operations before adding caches, indexes,
parallelism, or extra coordination.

This order does not postpone known correctness, security, data-integrity, or
required async-state consistency obligations. If performance or concurrency is
already an explicit requirement or a demonstrated issue in the current scope,
address it as a real input—not an imagined future problem. Merely avoiding
unrelated data/dependencies is clean design, not premature optimization.

## Start simple, especially for bigger tickets

Begin with the supported normal workflow and the smallest coherent design that
satisfies its real contracts. Large tickets need clearer decomposition—not more
speculative machinery. Split them into concrete, verifiable capabilities rather
than inventing a general framework for possible future use cases.

Do not start by assuming many edge cases. Add special handling when an actual
supported workflow, explicit requirement, security/integrity obligation, or
production evidence establishes the need. The ability to manufacture a state in
a test or mutate internal files does not make that state a supported scenario.

Start simple does **not** mean omit input validation, known failure handling,
security, or data-integrity obligations. It means establish the real baseline
first, then justify each additional branch and mechanism. A synthetic stress
fixture can expose scaling in the normal path without requiring a new product
edge-case policy.

## Start with the actual operation

Before choosing an abstraction or optimization, answer:

1. What supported user action or system event starts this operation?
2. What observable result must it produce, and which guarantees must hold?
3. Which data and dependencies are genuinely necessary for that result?
4. What work is on its critical path, including follow-up UI publication?
5. What existing work, checks, or layers can be removed rather than accelerated?

An existing helper, test, fallback, or defensive check is not proof that its
behavior belongs in the product. Trace its caller and governing requirement.

## Best practices

### 1. Separate the guarantee from its current mechanism

“Generate fresh run identities” is a goal. “Search every historical execution
tree before accepting each newly generated UUID” is one implementation choice,
not the goal itself. Challenge that choice before preserving or optimizing it.

For every material guard, state the failure it prevents, the supported scenario
or contract that requires it, its owning boundary, and its cost. A security or
integrity obligation can justify a guard without a previously observed incident;
a speculative possibility alone does not justify arbitrary machinery.

Distinguish fresh identity generation from resuming, importing, or accepting
externally supplied identities. Do not apply one path's obligations to another
without evidence. UUIDs provide probabilistic uniqueness, not a mathematical
zero-collision guarantee; that fact alone does not justify full-history scans.

### 2. Keep unrelated state off the critical path

A local action should normally operate on its required definitions, inputs,
owned state, and affected records—not inspect the entire application history.
If global work is genuinely required, identify the governing invariant and
explain why it must run at this lifecycle boundary.

For loops and nested lookups, write down the work count. If `M` new members each
inspect `H` historical roots, the design does `M × H` lookups. Concurrency does
not remove that work; it can increase contention and allocation pressure.

Do not blindly move required validation into the background. Decide its owner,
readiness boundary, invalidation, failure, and recovery semantics first. Initial
admission, changed-record checks, and explicit repair are different operations.

### 3. Use the smallest coherent owner and interface

Start with the existing owner of the behavior. Add a service, abstraction,
registry, projection, or subsystem only for a concrete responsibility or
boundary—not merely because the pattern is available.

Reuse capabilities only when their semantics and cost fit. An expensive general
execution-location lookup is not automatically the right tool for a small
identity question. Avoid empty forwarding layers, duplicate state owners, and
callers that bypass a public owner to reach its internals.

A small function can be the complete solution. Conversely, do not collapse real
lifecycle or security boundaries solely to reduce file count.

### 4. Match payload and UI work to the change

Publishing one newly created run should not repeatedly fetch, decode, rebuild,
and deeply compare every unrelated saved run. Identify the data needed for the
visible result, the authoritative update source, and how affected state changes.

Avoid full-subtree `JSON.stringify` equality as a default way to preserve object
references in frequently updated navigation. The comparison can cost more than
the reactive work it aims to avoid. Choose update/equality granularity from the
actual contract and measured workload, not a generic reuse helper.

Preserve hierarchy, selection, expansion, and concurrent-update freshness. A
fast stale row is not a correct solution. Partial updates or deferred detail
reads need explicit consistency/error semantics; they are not automatic fixes.

### 5. Do not gate a selected capability on unrelated discovery

If a user selects one runtime, its required availability/model checks should
not wait for every unrelated runtime's discovery merely because a shared API
uses an all-or-nothing aggregation. Preserve verification and useful errors for
the selected runtime, and preserve other runtimes' functionality.

Identify the true dependency: runtime readiness, model catalog, configuration
validation, run creation, history publication, and model inference are distinct
phases. Catalog discovery is not model-weight loading.

### 6. Remove unnecessary work before adding caches

First ask whether the operation, repeated refresh, defensive scan, or equality
comparison needs to exist. Only then consider batching, indexing, caching, or
background work for the remaining justified cost.

New persistent or cached state introduces lifecycle, invalidation, concurrency,
staleness, recovery, and memory obligations. State those obligations and the
measured benefit. Do not add another layer merely to conceal needless work.
Remove obsolete dependencies and branches when the behavior no longer needs
them; do not retain a parallel old path “just in case.”

### 7. Investigate performance after a functional baseline or demonstrated need

First establish working functionality and exercise it. Start detailed
performance analysis when real usage exposes a problem or the approved scope
already requires it. Do not make speculative tuning the first design phase.

Then capture the user's actual trigger and observable result. For launch, distinguish
click → creation response, workspace readiness, and exact new-history-row
readiness. A fast API response does not prove a fast or correct UI transition.

Record I/O/read counts, payload size, repeated requests, main-thread work, and
how these vary with relevant data volume. Use comparable cold/warm samples and
identify what “cold” means. Preserve errors and observer/environment limits.

Synthetic stress fixtures expose scaling; they do not prove the user's exact
workload or create a new capacity promise. Use [TESTING.md](TESTING.md) for safe,
test-owned validation and changed-build proof. A baseline installed app cannot
validate a source change it does not contain.

### 8. Resolve cross-boundary contracts early

Lessons from the runtime-lifecycle ticket:

- **Trace new authority through existing paths.** Before handing off a design,
  inspect actual startup, child launches, restart and recovery callers. A
  control secret filtered from provider launches can still leak through an
  ordinary terminal child; avoid inheritable secrets for private parent control.
- **Separate execution from management permission.** A remote/image-managed
  runtime may remain usable without desktop installation authority. Specify
  both branches behind the existing owner; neither disable preserved execution
  nor silently downgrade a failed managed boundary.
- **Match new state to its lifetime.** Check whether existing Reset/recovery
  deletes a proposed store. Keep independently owned runtime state outside
  server-data reset scope rather than silently changing destructive recovery.
- **Fix cleanup at the resource owner.** Temporary discovery must close its
  owned resources. Where replacement needs closure, use the relevant actual
  handles—not UI status or parent exit alone; do not turn a local cleanup
  obligation into a global process scanner.
- **Make revision impact explicit.** State the evidence, exact technical delta
  and whether intended behavior changes. Reapprove changed intent, not every
  technical clarification; preserve settled decisions instead of redesigning
  the whole feature each round.

## Anti-patterns from this repository

These are observed pre-refactor examples, not endorsements of the current
implementation or a claim that the whole application is over-engineered.

### Premature complexity for hypothetical performance, concurrency, and edge cases

**Anti-pattern:** designing caches, generalized concurrency coordination,
extra validation layers, or many special-case branches for imagined future
problems before establishing the clean architecture and supported functionality.

**Why it is wrong:** it adds state, dependencies, execution paths and maintenance
obligations without an established need. Defensive machinery can itself create
latency and make a simple operation depend on unrelated parts of the system.

**Instead:** build the smallest coherent functional baseline, exercise it, and
refine demonstrated problems. Preserve already-required correctness/security
contracts; do not confuse them with speculative hardening. The concrete
historical-scan and full-history examples below show unnecessary work; this
lesson does not claim their original authors' motivations were established.

### Historical collision scans during fresh UUID allocation

**Observed:** the Agent allocator defaults to `node:crypto.randomUUID`, yet its
collision lookup reads/parses/validates saved Org execution trees and builds
indexes to search their nested IDs. With 10 new Agents and 500 saved Orgs, the
instrumented path performed 5,000 stored-tree reads. These were existence checks,
not 5,000 actual collisions.

**Why it is wrong for this fresh-creation path:** it makes new identity allocation
depend on unrelated historical execution structures without an established
need for exhaustive historical proof. Fresh creation is not restoration.

**Lesson:** remove the historical collision-scan dependency from fresh UUID
allocation; do not merely make the scan faster. Preserve identity generation,
data continuity, and legitimate definition/configuration/admission requirements.
Do not generalize this to bypass existing-identity or security checks elsewhere.

Baseline owners: `AgentRunIdentityAllocator`,
`AgentOrgExecutionTreeLocationService.containsRunId`, and the stored-only location
service supplied by `GeneralProcessRunSupervisor`.

### Whole-history publication to show one new Org

**Observed:** around 500 saved Org roots, history responses contained roughly
10 MB of full execution trees, with multiple refreshes around one launch.
`runHistoryNavigationProjection.ts:retainEqualNodes` serialized entire old/new
workspace nodes for equality; renderer profiling identified it as a hotspot.

**Why it is excessive:** a one-run update amplifies into repeated full-collection
transfer and whole-subtree comparison. Reference reuse does not make the
comparison free, and backend improvements do not eliminate renderer work.

**Lesson:** simplify publication at the affected-state granularity. Preserve
server authority, hierarchy and freshness; reject designs that obtain speed by
publishing stale data. Do not prescribe a new cache or event system before
understanding which refreshes and payloads are actually required.

### Unrelated runtime discovery blocks selected-runtime readiness

**Observed:** all-runtime availability waited for unrelated Antigravity CLI
model discovery before Codex became selectable. The cold gate took roughly
2.27 seconds in one local configuration sample.

**Why it is excessive:** an aggregate discovery operation became a dependency
of a selected capability even though its own verification could finish sooner.

**Lesson:** distinguish selected readiness from completion of the whole catalog;
do not “fix” latency by declaring an unverified runtime available.

### Speculative defensive machinery becomes a preserved requirement

**Anti-pattern:** a reviewer/designer labels an existing check “safety,” then
requires it to survive without establishing its product/security contract. A
subsequent performance fix adds caches or indexes around the check.

**Reasoning failure in this investigation:** the Solution Designer initially
defended preservation of the existing collision mechanism as a safety concern,
before challenging whether fresh UUID creation needed historical membership
proof at all. That was the wrong starting point.

**Lesson:** first challenge whether the check belongs at all. Preserve the real
guarantee, not a hypothetical mechanism. Tests asserting an unnecessary scan
should change; tests proving required outcomes must remain.

The timings/read counts above came from local baseline investigation on
2026-10-03. Discovery sampling used a development renderer with an isolated
installed 1.4.92 backend; packaged post-Run tests used version 1.4.93 and
test-owned history. These are examples, not latency guarantees or proof of the
user's exact dataset.

## Before accepting a design

Use this short check within the existing design/review process—not as another
standalone document or a new layer of bureaucracy:

- [ ] Supported scenario, approved intent, and preserved guarantees are clear.
- [ ] Clean functional architecture comes first; speculative performance and
      concurrency machinery is deferred until there is a demonstrated need.
- [ ] The normal path comes first; additional edge-case handling has independent
      product, security, integrity, or operational justification.
- [ ] Every material guard/layer has a concrete contract and owner.
- [ ] Required data and dependencies are distinguished from unrelated state.
- [ ] Historical/global work and nested-loop scaling are explicitly justified.
- [ ] Payload, renderer cost, and publication freshness are considered together.
- [ ] Unnecessary work was considered for removal before caching or abstraction.
- [ ] Obsolete paths/dependencies and affected tests have an explicit disposition.
- [ ] Verification proves user-visible outcomes and work reduction without
      weakening correctness; uncertainty is stated rather than hidden.

In the existing design spec, summarize the required path, rejected unnecessary
work, expected scaling, preserved contracts, and verification evidence. Keep it
proportionate: a narrow change needs a narrow explanation, not a new framework.
