# Design Principles

This is the canonical shared design reference for the software engineering team. Use it for design work and technical review. Each practice has one home: its principle states the practice, how to apply it, the signals that it may be broken, and the question a reviewer asks. The sections after the principles order the work, list the structural triggers, assess design health, classify size and risk, and describe local patterns; they point back to the principles rather than restating them.

## Contents

- [The Approach: Spine First, Practices In Context](#the-approach-spine-first-practices-in-context)
- [Project-Specific Design Principles](#project-specific-design-principles)
- [Terminology](#terminology)
- [Core Principles](#core-principles)
  - [1. Approved Behavior And Production Reality](#1-approved-behavior-and-production-reality)
  - [2. Data-Flow Spine Inventory and Clarity](#2-data-flow-spine-inventory-and-clarity)
  - [3. Ownership Clarity and Boundary Encapsulation](#3-ownership-clarity-and-boundary-encapsulation)
  - [4. Off-Spine Concerns Around The Spine](#4-off-spine-concerns-around-the-spine)
  - [5. Current-Schema Runtime And Proportionate Persisted-Data Transitions](#5-current-schema-runtime-and-proportionate-persisted-data-transitions)
  - [6. Supported Product Scenario And Reachability Gate](#6-supported-product-scenario-and-reachability-gate)
  - [7. No Dead Code](#7-no-dead-code)
  - [8. Clean-Cut Replacement And Explicit Removal](#8-clean-cut-replacement-and-explicit-removal)
  - [9. Dependency Direction](#9-dependency-direction)
  - [10. Interfaces Follow Ownership](#10-interfaces-follow-ownership)
  - [11. Reusable Owned Structures Stay Tight](#11-reusable-owned-structures-stay-tight)
  - [12. File Responsibility And Placement](#12-file-responsibility-and-placement)
  - [13. One Owner For Coordination Policy, No Empty Layers](#13-one-owner-for-coordination-policy-no-empty-layers)
  - [14. A Spine-First, Concrete Design Document](#14-a-spine-first-concrete-design-document)
  - [15. One Vocabulary: One Word, One Meaning; One Meaning, One Word](#15-one-vocabulary-one-word-one-meaning-one-meaning-one-word)
  - [16. Visible Dependencies, One Composition Root](#16-visible-dependencies-one-composition-root)
- [Practical Application Guide](#practical-application-guide)
- [Structural Triggers](#structural-triggers)
- [Task Design Health Assessment](#task-design-health-assessment)
- [Task Size And Architectural Risk](#task-size-and-architectural-risk)
- [Common Local Patterns](#common-local-patterns)

## The Approach: Spine First, Practices In Context

The method is spine first. Start from the end-to-end data-flow spine of each use case, with its secondary, return/event and bounded local spines (Principle 2). The spines locate ownership: each node on them owns something concrete (Principle 3), and the concerns around them attach to an owner (Principle 4). Owners group into subsystems and modules, and those map to files (Principles 11, 12). Most dependencies follow from this: each owner depends on the next owner on its spine and on the concerns it uses (Principle 9). A dependency the spine does not show, above all one that points back against it, is the one to look at closely.

The other principles are practices that support this method. Each exists to keep ownership, ordering and behavior clear and correct, and each fits some contexts and not others. Practices can pull against each other: extract a shared structure or keep two apart (11), split a file or keep the codebase's layout (12), add a port or give consumers the owner (13), pass a collaborator in or connect it after construction (16). The context decides which one applies. This holds for every role that uses these principles: designing, reviewing a design, implementing, and reviewing code. Examples 10 and 11 in the team's design examples show practices chosen by context.

- **Purpose first.** Before applying a practice, name the problem it solves here: a bug, a behavior risk, a hidden dependency that matters, a cycle that tangles ownership, a policy that will drift between copies, dead code in touched files. When there is none, the practice calls for no new structure. Applying it where it only adds structure is itself a design defect, not compliance.
- **The smallest structure that works.** Prefer the smallest structure that keeps the design clear. Add a component, port, layer or pattern only for a concrete need: a cycle that tangles ownership, a real difference in what callers need, real repetition, a real hidden dependency that bites.
- **Deviation with a reason.** A design may knowingly deviate from a practice when the reason holds for this case. It records the deviation and the reason in the design spec (a choice made during implementation goes in the implementation handoff), and reviewers judge the reason, not the conformance. A reason names what following the practice would cost here and why the deviation causes no problem the practice exists to prevent.
- **What holds in every context.** A few things are not trade-offs, because the problem they prevent is real in every context: the supported behavior basis and product reachability (Principles 1, 6), a clear owner for each concern (3), an evidence-backed persisted-data decision (5), no dead code in touched files (7), clean-cut replacement (8), and no behavior decided by a missing owner or a silent fallback (13, 16). A deviation from one of these needs what that principle itself names, such as the user's approval for a compatibility path (8), not a recorded reason alone.
- **Signals are leads.** A principle's Signals show where to look. A signal alone is not a finding until it names the problem it causes in this change.
- **Findings name the problem.** A review finding names the concrete problem the design or code causes, not only "Principle X not followed". A different structure the reviewer would prefer, where the design works and causes no such problem, is a suggestion, not a finding ([ticket-scope.md](ticket-scope.md#common-situations)). Added structure that does nothing is not such a preference: an interface, port, adapter or wrapper that meets Principle 13's empty indirection check is a finding, even though it works.
- **Rulings hold.** Once a review round accepts a shape for a stated reason, later rounds keep that ruling unless new evidence shows a problem with it, and name that evidence when they change it.

## Project-Specific Design Principles

This file holds the general design principles that apply to every software
project. A project can also have its own project-specific design principles,
such as its patterns, libraries and conventions, in a `DESIGN.md` at its
repository root and in closer `DESIGN*.md` files for parts of the repository.
When designing, implementing, or reviewing a change, apply the general
principles and respect the project's own as well.

- Check whether the project has `DESIGN.md` files that apply to the changed
  code, read them, and follow them. A closer file refines the root one for its
  directory. When the design spec records which files apply, use those.
- Project-specific principles add to the general principles; they do not waive
  them or change approvals, ownership, routing, or the review bar. When the two
  conflict, follow the general principles and record the conflict as an open
  question for the user. When a project rule no longer matches the repository,
  record the discrepancy.
- When a project has no `DESIGN.md`, follow the conventions visible in its
  existing code. The Solution Designer creates one during the ticket's
  architecture design, as the team's `project-documents.md` describes.
- A project keeps its own design cases (real mistakes and their fixes, with
  its tickets and names) in its `DESIGN.md`: a `Design Cases` section, or where
  that file says. Read them with the case
  studies in the team's design examples when a design touches the same shape.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Primary spine`: the main top-level business-relevant spine for one in-scope use case. There can be multiple primary spines in one design when multiple use cases or major business paths are in scope.
- `Return/Event spine`: a meaningful return path, callback path, or event-propagation path that matters to the behavior. It may move outward, upward, or back across boundaries; direction is not the deciding factor, business relevance is.
- `Bounded local spine`: an internal flow inside one owner, such as an event loop, worker cycle, state machine, queue dispatcher, or callback dispatch path. It is attached to a parent owner and adds local detail; it does not replace the longer primary spine.
- `Supported product scenario`: a task-relevant behavior initiated by a real actor, supported system or operational event, or governing contract, with a coherent goal or event, a supported entry surface, an expected outcome, and an evidence-backed path through the relevant lifecycle.
- `Scenario validity`: whether a scenario represents a supported normal workflow or an explicitly supported edge workflow, rather than merely a mechanically possible sequence.

## Core Principles

Apply these principles from behavioral foundation through macro structure before detailed checks. Every design and technical review must establish the supported product-scenario basis for the behavior it serves. The detailed premise gate in Principle 6 is conditional only for an additional material scenario or mechanism not already established by that basis; it is not a separate edge-case discovery stage.

A principle may end with **Signals** (what suggests the practice may be broken) and **Check** (the question a design or review answers).

### 1. Approved Behavior And Production Reality

- Architecture review and code review are technical reviews, not a second business-approval process. Begin by understanding the approved business intent and use the approved requirements as the intended-behavior authority. If they are materially ambiguous or inconsistent, return the gap instead of judging, redefining, or inventing behavior.
- Before applying structural principles, establish the relevant behavioral baseline: existing behavior, the approved change, and behavior that must remain unchanged or outside scope.
- Understand the complete relevant behavior and production path from a supported trigger or governing contract to its meaningful outcome. The behavior may be user-initiated, system-initiated, operational, or contract-driven. Trace enough of its lifecycle boundaries to judge the change correctly; this does not require understanding unrelated parts of the product.
- Read the current code path before defining the target design.
- When a mechanism serves several kinds of subject (for example a person or a company account, local or remote) or a capability has several entry forms (for example a tool's parameter modes), trace the path for each kind and each form; a path traced for one is not evidence for another. When two parallel paths serve one capability, compare their gates and refusals: a gate on one path only is a finding or an explicit decision.
- Cite the file and line for each statement about existing code that the design relies on. Compare "mirrors X", "the same as Y" and "as today" rule by rule against that code, and count callers at their call sites, not declarations.
- **Signals:** a generic subject ("the root", "a run") standing for several kinds; one example standing for every entry form; a gate on only one of two parallel paths; "the compiler enforces", "mirrors", "as today", or a count without a source.
- **Check:** Which kinds and entry forms does each mechanism serve, and where is each one traced? Which statements about existing code carry no citation?

### 2. Data-Flow Spine Inventory and Clarity

- Identify and inventory the relevant data-flow spines for each in-scope use case. Build a small inventory early and use it to decide ownership and decomposition.
- A practical spine inventory row should usually capture:
  - `spine_id`
  - scope
  - start
  - end
  - governing owner
  - why it matters
- Enumerate all relevant spines explicitly, not only the biggest one:
  - primary spines,
  - secondary spines,
  - return/event spines,
  - bounded local spines inside one owner when a loop, worker cycle, state machine, or dispatcher materially affects the design.
- `Primary` is per use case/path, not globally singular. If two important use cases each have a top-level business path, both can have their own primary spine.
- For each spine, state its start, end, owner, and why it exists. Write each primary spine as a short arrow chain in the actual call order, callbacks and hooks included, with one governing owner per node, and name its main-line nodes in natural domain language.
- Keep only true main-line nodes on each spine.
- `Spine Span Sufficiency Rule` (mandatory): a primary spine must be stretched far enough to expose the real business path, not only the local edited segment.
- The primary spine should usually show:
  - the initiating surface/caller,
  - the important orchestration or boundary crossing,
  - the authoritative owner boundary,
  - any critical downstream mechanism or dependency,
  - the meaningful downstream effect, returned result, or emitted consequence.
- Practical default: use at least `4-5` meaningful nodes on the primary spine unless the full real path is genuinely smaller.
- A bounded local/internal spine is additive detail. It does not replace the longer primary spine when the longer spine is needed to judge ownership, API shape, or business meaning correctly.
- Shapes:
  - Good: `Browser UI -> Session Bootstrap -> Runtime Invocation -> Exposure Composer -> Browser Surface`
  - Bad: `Exposure Composer -> Browser Surface`
  - Common: CRUD/request `Frontend -> API -> Service -> Repository -> Database`; runtime/worker `API -> Run -> Runtime -> Worker/Event Loop`; bounded local loop/state `Queue/Event Source -> Loop/State Machine -> Handler/Transition -> Output/Next Event`.
  - Pairing: primary spine `Request Surface -> Session Owner -> Runtime -> Event Loop Owner`, with the bounded local spine inside `Event Loop Owner`: `Receive Event -> Normalize -> Select Handler -> Apply Transition -> Emit Next Event`.
- **Signals:** the declared inventory is incomplete, or the main line, secondary lines, or bounded local spines are hard to draw (the design is probably fragmented); many peer coordinators with no obvious main line; important spines left implicit instead of named; the named spine stops at the local edited helper and hides the initiating surface, authoritative owner boundary, or downstream consequence; event loops or state machines materially affect the behavior but no bounded local spine is described; a governing owner written as "A + B"; a function passed to one mechanism so it can reach another collaborator (Principle 13).
- **Check:** What are the primary, secondary, return/event, and bounded local spines for the in-scope use cases? With several use cases or major business paths, does each have its own primary spine instead of one vague chain? Is each primary spine stretched to the real business path, authoritative owner, and downstream consequence? Which bounded local spines exist inside owned nodes, and where do they start and end? What are the main domain subject nodes on each spine? What are the return/event spines when the change is async or event-driven?

### 3. Ownership Clarity and Boundary Encapsulation

- Each main-line node must own something concrete:
  - state
  - lifecycle
  - invariants
  - sequencing
  - contracts
  - transformations
- Ownership is the concrete form of separation of concerns. Separation of concerns is still mandatory, and it should get stronger as the spine and ownership model become clearer; derive it from the spine, main subject nodes, and ownership boundaries rather than treating it as the starting point.
- Define what each main-line node owns before splitting off-spine concerns.
- Main domain subject nodes on the spine should stay coherent; do not force one node to absorb every nearby responsibility just because it is on the main line.
- When additional responsibilities are needed to make one node work, split them into clear off-spine concerns around that owner (Principle 4) instead of creating hidden mixed-concern blobs or letting the node become a god-object.
- If a concern has no clear owner, the boundary is wrong.
- `Authoritative Boundary Rule` (mandatory): callers above a subject's authoritative boundary must depend on that boundary, not on that boundary and one of its internals at the same time. This is the `no boundary bypass / no mixed-level dependency` rule.
  - It is about authority and encapsulation, not about labels such as `service`, `manager`, `repository`, `controller`, or `facade`.
  - If a caller needs both an outer boundary and one of that boundary's internal managers, repositories, helpers, or lower-level concerns, either the boundary is wrong or the caller is bypassing ownership. Choose one authoritative entrypoint, or redesign the boundary and responsibilities explicitly.
  - If callers bypass an internal concern only because the outer boundary does not expose enough usable API, strengthen the authoritative boundary or reshape ownership explicitly. Do not normalize the bypass as the steady-state design.
  - Good shape: `Caller -> Outer Boundary`, `Outer Boundary -> Internal Owned Mechanism`. Bad shape: `Caller -> Outer Boundary`, `Caller -> Internal Owned Mechanism`, `Outer Boundary -> Internal Owned Mechanism`.
- When a thin public facade and a deeper governing owner both exist, name both.
- API, interface, query, and command shape should be derived from this ownership and boundary model (Principle 10).
- **Signals:** a caller depends on both a public boundary and one of its internal managers, repositories, helpers, or lower-level concerns at the same time; a higher boundary reaches directly into a deeper layer the intended owner should encapsulate; one node collects many unrelated duties; a concern has no clear owner.
- **Check:** What does each node own? Which boundaries are public entrypoints and which are internal owned sub-layers, and which callers may depend on each? Is any caller depending on both an outer owner and one of its internals, and if so which boundary should remain authoritative?

### 4. Off-Spine Concerns Around The Spine

- Off-spine concerns should serve a clear owner on the spine.
- Keep off-spine concerns off the main line unless they truly own core sequencing.
- Off-spine concerns may resolve, persist, adapt, map, publish, observe, or translate, but they should not compete with the spine.
- `Capability-area reuse`: before creating a new off-spine concern or helper, check whether an existing capability area or subsystem already owns that category of work (status, events, handlers, persistence, streaming, bootstrap, shutdown, and similar) and should be reused or extended.
- `Spine`, `owner`, and `off-spine concern` are architecture relationship terms, not naming templates.
- Do not name files, folders, services, classes, or types with vague labels like `Support`, `Supporting`, `OffSpine`, `SideConcern`, or `Helper` just because they sit off the main line. Name them by the concrete concern they own.
- **Signals:** shared helpers that quietly own business behavior; off-spine concerns sitting on the main line without owning sequencing; new helper or service pieces created ad hoc although an existing subsystem already owns that kind of work.
- **Check:** Which off-spine concerns serve which owner on the spine? Which off-spine needs should reuse or extend an existing capability area instead of creating a new helper?

### 5. Current-Schema Runtime And Proportionate Persisted-Data Transitions

- A code-model, serialization, or storage-schema change triggers persisted-data analysis, not an automatic migration.
- Decide explicitly whether existing data is `Not Affected`, `Directly Usable — No Migration`, `Discard or Rebuild`, `Migration Required`, or `Undetermined`, and make that decision before designing migration machinery.
- Base the decision on representative stored data, normal reader and writer behavior, semantic meaning, current invariants, physical-store constraints, data volume, and operational risk.
- Existing data is directly usable when the normal version-agnostic runtime can read it correctly and preserve required semantics and invariants without old-version branches. For example, a stored JSON superset does not require rewriting merely because the current model ignores obsolete extra attributes.
- A generic reader policy that projects recognized fields or tolerates irrelevant extras is not automatically backward-compatibility code. Version-specific branching, dual reads/writes, compatibility fields, and fallback paths in current business logic remain prohibited (Principle 8).
- Choose `Discard or Rebuild` when the data is disposable or safely reproducible and that outcome satisfies the requirements.
- Choose `Migration Required` only when existing data must be transformed for correctness, current invariants, a required physical-store change, privacy/security, or another concrete operational need. State the benefit and why direct use or rebuild is insufficient.
- When migration is required, design it as a separate owned spine in an explicit startup, deployment, or maintenance boundary, and keep the target runtime current-schema-only. Confine historical-schema knowledge there; define ordering, validation, completion, interruption/recovery, and risk-appropriate backup or rollback behavior. Never compensate with version-specific compatibility behavior in normal business or runtime paths.
- Do not rewrite large data sets merely for representational cleanliness. Weigh I/O, downtime, corruption exposure, recovery complexity, and rollout constraints against the migration's concrete benefit. A stored name that carries a wrong or second meaning is not mere representation (Principle 15): renaming it requires a migration, and the weighing applies to how that migration is done.
- If the evidence is insufficient, choose `Undetermined` and investigate or block the design rather than assuming either migration or safety.
- **Signals:** old-schema decoding, branching, or dual reads/writes embedded in current business services or normal repositories instead of isolated migration-owned code; bulk migration or destructive rewriting proposed merely because a schema changed, without evidence that existing data must be transformed or that the operational benefit justifies the risk; migration steps that can partially apply without a completion marker, validation, restart strategy, or recovery path; a permanent mapping between a stored name and a different code name for the same concept.
- **Check:** What persisted-data transition decision applies, and what representative reader, semantic, invariant, storage, volume, and operational evidence supports it? If migration is required, which owner performs it, and how are ordering, completion, validation, interruption, recovery, and rollout handled?

### 6. Supported Product Scenario And Reachability Gate

- Every in-scope behavior and every design decision that claims to serve a behavior must have a supported product-scenario basis before detailed design or review conclusions are accepted. The basis identifies the actor, supported system or operational event, or governing contract; the coherent goal or event; the supported entry surface; the expected outcome; and the relevant lifecycle path.
- `Scenario validity` is distinct from technical reachability. A scenario may be mechanically reachable through exposed endpoints yet still be unsupported or contrived when it has no coherent product goal, requires contradictory user intent, depends on artificial timing, or lacks an explicit product, security, operational, or contractual reason.
- Classify each scenario before it can affect a design or review decision:
  - `Supported Normal Scenario`: an ordinary supported workflow with a coherent goal or system outcome.
  - `Supported Explicit Edge Scenario`: an unusual workflow or state that is explicitly supported by the product, security posture, operational contract, or governing contract.
  - `Technically Possible but Unsupported/Contrived`: mechanically callable or constructible, but not supported by a coherent workflow, explicit contract, or independent product evidence. Do not require design or code for it in the current scope.
  - `Unclear`: material scenario evidence is missing. Investigate or block the dependent decision instead of prescribing speculative machinery.
- `Product Reachability` is a necessary path property, not the complete scenario judgment. For a supported scenario, normal product execution, an explicitly supported user, system, or operational action, or an established product, security, or operational contract must produce it from a real supported state without manually mutating hidden state or relying on test-only or synthetic setup to create the initiating state.
- The existence of a method, state field, generic capability, fallback branch, defensive mechanism, or ability to mutate internal files is not by itself evidence that the product produces a scenario. An internal file is not a user-operated surface unless the product explicitly exposes it as one.
- A test-only caller, synthetic reproduction, or artificially constructed state may reproduce an already established product path; it cannot establish that the path exists.
- A complete scenario witness includes the coherent actor goal or governing event, the product-supported initiating trigger, the concrete current or approved target caller/event path, the claimed state at the relevant lifecycle point, and the material consequence.
- `Independent Origin Rule` (mandatory): the initiating trigger or governing contract must exist independently of the premise or mechanism under review. For a user-facing premise, name both the exposed product surface and supported user action. For a non-user premise, name the supported system event, operational action, or applicable governing contract.
- A client, SDK, endpoint, handler, middleware, generic infrastructure, or proposed target mechanism may appear only after the initiating basis in the witness; it cannot prove that the product exposes its own path.
- Trace the normal production path forward from the supported trigger. When the initiating basis is a governing contract, name the concrete caller or event that exercises it. Do not reason backward from a fallback branch, synthetic reproduction, or test and invent an initiating cause. Mechanical possibility at any one link is insufficient.
- Two individually supported actions do not establish a supported concurrent workflow. Multi-tab, cross-session, race, or contradictory-action behavior needs its own independent product goal or explicit contract.
- Classify distinct initiating conditions separately when their evidence or consequence differs. Do not use an `A or B or C` list to create aggregate reachability; one real but irrelevant condition does not validate the speculative conditions or the claimed consequence.
- Manual tampering, arbitrary deletion or corruption, unsupported data/schema versions, infrastructure failure, or interrupted execution are outside scope by default. Count one only when the product explicitly supports the relevant action or state, or an established product, security, or operational contract makes it relevant and evidence establishes the actual lifecycle path.
- Without a supported product scenario and its observed or governing production path, the premise cannot drive a finding or new machinery. A scenario that is `Technically Possible but Unsupported/Contrived` is not promoted merely because its code path can be reached.
- Persist the supported scenario basis and every additional material-premise classification in the applicable design or review artifact, including scenarios rejected as unsupported or `Not Reachable`. Record the complete relevant behavior and production path, actual system lifecycle, and evidence that makes the scenario supported, unsupported, reachable, unreachable, or unclear.
- Require additional state, APIs, abstractions, coordination, or recovery behavior only when they address a supported reachable material problem and are proportionate to its consequence. Technical completeness means correctness for supported behavior and real operational constraints, not handling every imaginable state.
- See Example 8, Supported Product Scenario Versus Technical Possibility, in the team's design examples for positive normal and explicit-edge examples, rejected technical-only scenarios, and the downstream review treatment.
- **Signals:** a technical finding or new machinery is justified only by a hypothetical state, generic capability, or test-only path rather than approved behavior and current or target-production reachability.

### 7. No Dead Code

Dead code is code that nothing in the product reaches anymore. It makes the codebase larger, slower to read, and misleading, so removing it is part of every change, not optional cleanup.

- **What counts as dead:**
  - branches that can never run;
  - functions, classes, exports, files, and imports that nothing calls or imports;
  - feature flags and configuration options with only one value still in use, and the code behind the other values;
  - tests, fixtures, and mocks for code that no longer exists;
  - code that only its own tests call;
  - paths that a change replaces (Principle 8).
- **Evidence:** before removing code, show that nothing reaches it. A search finds no references, and the compiler, linter, or unused-export check agrees where the project has one. Also check entry points a search can miss: dynamic imports, reflection, configuration and routing files, plugin or script entry points, and public APIs used outside the repository. Code reached only through such an entry point is not dead.
- **Scope:**
  - remove dead code in the files and modules a change touches, including code that was already dead before the change;
  - record dead code found elsewhere as a follow-up with its evidence, in the ticket's `follow-ups.md` ([ticket-scope.md](ticket-scope.md#recording-follow-ups)). Do not leave it unrecorded, and do not mix it into an unrelated change.
- Removing dead code does not change approved behavior, because nothing reaches it. If removal would change something a user, system, or external caller can still reach, the code is not dead; treat the removal as a behavior change that needs approved requirements.
- Record each removal, with its evidence, in the design's removal plan.
- **Signals:** dead code left in the files a change touches, or code removed as dead without evidence that nothing reaches it.
- **Check:** Which code in the touched files and modules is dead, what evidence shows that nothing reaches it, and which dead code found elsewhere goes on the follow-up list?

### 8. Clean-Cut Replacement And Explicit Removal

- No backward compatibility or legacy retention is a hard modernization rule for in-scope behavior. Design the clean-cut target directly and make removal of obsolete paths explicit.
- Removal is first-class architecture work, not optional cleanup. When clearer ownership, reusable owned structures, or better file responsibilities make redundant pieces unnecessary, name and remove or decommission those pieces explicitly in scope. Once the target shape is clear, list in the removal plan what it makes unnecessary, together with the dead code in the touched files and modules (Principle 7).
- If a proposed solution keeps compatibility wrappers, dual-path reads/writes, or fallback branches only to preserve old behavior, redesign it toward a clean-cut replacement and an explicit removal plan.
- **Signals:** compatibility wrappers, dual-path behavior, or legacy fallback branches kept only to preserve old flows.
- **Check:** Which legacy paths, compatibility wrappers, dual-path branches, obsolete files, or deprecated boundaries are removed in this change? Which duplicated, fragmented, or now-unnecessary helpers, files, or structures become removable because the design gives them a clearer owner or replacement?

### 9. Dependency Direction

- Dependency direction follows ownership; name allowed directions and forbidden shortcuts explicitly.
- Layering is optional explanatory output only. Do not use layering as a first principle. If layering is used as explanation, it must still follow ownership and encapsulation: a higher layer should not skip an owning boundary and directly reach into a deeper layer that the intermediate boundary already owns (Principle 3).
- Direction says who may depend on whom; Principle 16 says how an owner obtains what it depends on. A dependency that points the right way but is reached through a process-wide lookup is judged by Principle 16's conditions.
- **When two owners need each other.** The spine usually shows one direction as the main line: an order belongs to a user, so orders depend on users. Find out what the backward need really is, and choose by context:
  - a reaction to the other's change (cancel a user's open orders when the user is deactivated): an event or listener, so the backward direction is only a notification (Principle 16);
  - a use case that needs both (delete a user only when no order is open): an owner above both that drives the sequence (Principle 13);
  - a check the upstream owner must enforce itself: a small interface the upstream owner defines and the downstream owner implements, so the dependency between modules stays one-way;
  - data both need: a third owner both depend on, or one owner when the two are one concept split badly;
  - only the order of construction: connect one collaborator after construction, or give it a narrow interface (Principle 16). Neither is required, and a reviewer does not swap one for the other.

  A cycle in which each owner drives part of the other's sequence tangles ownership; that is the one to redesign. See Example 11 in the team's design examples.
- **Check:** Which dependencies are allowed, and which shortcuts are forbidden? For each dependency that points back against the spine, what is the need behind it, and which answer above fits?

### 10. Interfaces Follow Ownership

- API, interface, query, and command shape should be derived from the ownership and boundary model (Principle 3), not designed independently from it.
- Interfaces, APIs, queries, commands, and reused service methods must follow ownership and separation of concerns: one boundary, one subject, one responsibility, explicit identity shape.
- Split APIs, queries, commands, and service methods by subject when identity meaning differs; prefer explicit `getAgent...` / `getTeam...` style boundaries over one generic method that guesses what an ID or selector means.
- If one API, query, command, or service method accepts a generic ID or selector that may refer to different subjects, or returns a generic mixed-subject list, split it into explicit subject-owned boundaries or require an explicit compound identity shape.
- **Signals:** generic interface boundaries, list or query surfaces, or service methods that accept one ambiguous ID or selector and then guess what subject it belongs to.
- **Check:** Which interface boundaries exist, what subject does each own, and what identity or selector shape does each accept?

### 11. Reusable Owned Structures Stay Tight

- When repeated data structures, types, normalizers, converters, mappers, or schemas appear across several files, extract them into reusable owned files under the correct subsystem instead of duplicating them.
- Reusable owned structures must be semantically tight: remove redundant attributes, avoid overlapping parallel representations for the same domain subject, and keep each field's meaning singular and explicit. Tighten a structure before standardizing it or promoting it into a reusable owned file.
- Shared cores and specialized variants are valid only when the shared base is truly coherent. Do not create one-for-all base structures that collect mostly-optional fields for unrelated cases; when a base accumulates optional fields mainly to serve divergent cases, split it into a tighter shared core plus meaningful specialized variants, or use composition, under a clear subsystem owner.
- Put code in a shared or common folder only when it is truly cross-cutting and concern-agnostic.
- Each fact is derived by one owner. Other parts read the stored or returned result, or verify it and refuse a mismatch; they do not recompute it.
- When a stored or shared structure is split, re-kinded or extended, list the code that reads it and the code that reads anything derived from it (views, endpoint sets, validators, indexes, streams), with the decision for each.
- **Where it bends:** extract a structure when its copies share one meaning and must change together. Shapes that look alike but serve different subjects or change for different reasons stay separate; forcing them into one shared base is the overreach this principle warns about.
- **Signals:** shared structures that still carry redundant fields, overlapping representations, or mixed meanings after extraction; the same value worked out in two places or on two nodes; an inventory that lists only the direct readers of a changed structure.
- **Check:** Which shared data structures, schemas, DTOs, mappers, or types need tightening so redundant attributes or overlapping representations are removed instead of standardized? Which views, sets, validators, or streams are built from a changed structure, and what does each do with the change?

### 12. File Responsibility And Placement

- One file owns one concrete concern. If one file owns multiple unrelated concerns, split it. If a subsystem or optional module grouping becomes a mixed catch-all, reorganize it into clearer owned files and boundaries.
- File placement must follow ownership; move or split files when their paths no longer match their real concern.
- Subsystem, folder, and file mapping should be spine-led and ownership-led, but not mechanical: do not impose a rigid one-folder-per-step rule. Specify target subsystems and files explicitly; use optional module groupings only when they improve readability or reflect an established codebase pattern.
- Distinct structural depths often deserve distinct folders, but do not force artificial over-splitting. When the layout deviates from the codebase's existing one, flatter or more split, record why; when it splits more, make sure each split reflects a real owner or boundary.
- **Where it bends:** the codebase's existing layout is the default while it keeps ownership readable. Split or move a file for a real second concern or a path that misleads, not to match an ideal layout.
- **Signals:** names that do not describe the actual owner or role; misplaced files whose paths hide the real concern; folder layouts so flat they hide boundaries, or so split that they create artificial structure with no real owner.
- **Check:** Which subsystems and files should own the target structure, and are any optional module groupings actually needed? Does the subsystem, folder, and file layout make ownership and structural depth readable without artificial fragmentation?

### 13. One Owner For Coordination Policy, No Empty Layers

- If provider selection, fallback, retry, aggregation, routing, fan-out, or validation logic repeats across callers, give that policy a clear owner.
- If a proposed layer or module only forwards calls and owns no policy, translation, or boundary concern, remove it.
- **Empty indirection check.** A new interface, port, adapter or wrapper is such a layer, a defect and a review `Fail` even though it works, when all three hold:
  - (a) it has one implementation and no real reason for a second: no I/O or remote boundary, no plugin point, no test that needs a fake where the real owner cannot be used;
  - (b) it only forwards: its consumers could take the owner directly, or a narrowed type of it (in TypeScript `Pick<Owner, "isOpen">`; elsewhere an interface the owner itself implements), and it adds no combining of owners, no translation and no invariant;
  - (c) it solves no problem you can name (no dependency cycle, no startup-order constraint, no boundary): it exists to match a practice's wording.

  The problem it causes is the indirection itself: one more type that every reader steps through and every change to the owner must follow. Give its consumers the owner, or a narrowed type of it, instead. Not empty: a narrowed type of the real owner; a port at a real boundary; an adapter that combines several owners into one capability that several consumers use (Case 8 in the team's design examples).
- One sequence has one owner that calls each of its mechanisms itself, in order. A mechanism does not take over a step of another owner's sequence through a function passed in (for example `engine.send(input, transmit)`, where `transmit` belongs to another component and the engine decides when it runs and what its failure means): that splits the sequence between two owners even when every dependency points the right way. Otherwise a function passed in is a one-method interface and is judged like one: a question the receiver asks (`isOpen(task)`) or a notification (events, lifecycle hooks) is fine. A component whose rules branch on which side or context it runs in holds two roles; give each its owner.
- A behavior the requirements name is decided by an explicit rule with its own result, not reached because a lookup finds nothing, an event is missing, or one status counts as another.
- **Where it bends:** a coordination policy is a rule with choices (which provider, when to retry, what counts as ready); the same one-line call in two places is not one. A thin entry the framework or transport requires, such as a route handler that parses and forwards, owns that boundary and is not an empty layer.
- **Signals:** the same coordination policy repeated in several callers ("the same shape in each root"); empty indirection layers that only pass work through; a port or wrapper with one implementation whose methods each call one method of one owner; one sequence split between collaborators; "finds no X, so …", "counts as", or a lifecycle end that changes no state.
- **Check:** Who drives each sequence, and in what order? Which required behavior happens only because something is missing? What does each new interface, port, adapter or wrapper add beyond forwarding, or which problem does it solve?

### 14. A Spine-First, Concrete Design Document

- The design document should read spine-first, not file-first. Files, folders, and any optional module groupings are a derived implementation mapping, not the primary structure of the architecture story; let them appear after the design story is clear.
- Record the change inventory explicitly: `Add`, `Modify`, `Rename/Move`, `Remove`.
- When the change is not greenfield, define the change or refactor sequence from the current state to the target, including migration only when the approved persisted-data decision requires it (Principle 5).
- Use concrete examples when they materially improve clarity. Do not leave a non-obvious design entirely abstract when a short example would explain the intended shape faster: when a spine, interface split, folder choice, or bounded local flow would otherwise stay abstract or easy to misread, add a short good-shape example and, when useful, a bad-shape anti-example.
- **Check:** Which parts of the design need a concrete example to make the intended shape obvious? What is the change or refactor path from the current state to the target?

### 15. One Vocabulary: One Word, One Meaning; One Meaning, One Word

- A domain word means one thing everywhere it appears: code identifiers, stored fields, API and wire fields, schemas, tool names and texts, UI words, and docs. A concept has one name everywhere. Each change's names can look natural on their own while the system drifts, so judge a name against its other uses, not only against its own file.
- Give different aspects different words, for example `remote` for a location (another node) and `peer` for a relationship (a remote node registered with this one). Name an ID for what it identifies; two different IDs never share a name.
- A qualifier that repeats the noun (`ActiveSession` where every session is active) or contradicts the thing (`listOpenOrders` returning closed orders too) is a finding.
- When the project keeps a glossary (its `DESIGN.md` says where), it is the authority for domain words: a design that introduces a word, or gives a word a new meaning, adds it there in the same change. Without one, list the domain words the design uses in the design spec's Terminology and record `No project glossary found`.
- Stored names stay in sync with the code. A rename that removes a wrong or second meaning, or a second name, changes code, wire, tool, UI, and stored names together, as a clean cut (Principle 8). The stored name changes through a data migration, following the project's data migration rules (found through its `DESIGN.md`; Principle 5), never behind a permanent mapping from the old name.
- **Signals:** two names for one concept ("X, also called Y"); a name whose meaning depends on the file it is in; a tool or API name that says less or more than it does.
- **Check:** Which domain words does this design use or introduce, and does each mean the same thing everywhere it appears? Is any concept named two ways, or any name used for two concepts?

### 16. Visible Dependencies, One Composition Root

An owner's dependencies are part of the architecture: a reader should see what an owner needs and in what order owners come to exist. Passing collaborators in is the default because it keeps two things cheap: the signature shows what an owner needs, and a test builds the owner with fakes, with no global state that leaks from one test into the next. A lookup or a connection after construction gives those up; that is a cost to weigh, not a finding. Three problems make it a finding: behavior that silently does nothing or falls back when an owner is missing; a wiring mistake that surfaces only on some later request instead of at startup; and a hidden cycle in which owners drive parts of each other's sequence. A setter or a global is not the problem in itself; these are.

- By default an owner receives the collaborators it depends on through its constructor, or as arguments of the call that needs them.
- One composition root (the server's or app's startup code) creates the owners and passes each one its collaborators. The order in which owners must exist is visible there, in code, not in comments elsewhere.
- When two owners need each other, Principle 9 says how to choose. When only the order of construction is left, connecting one collaborator after construction in the composition root is an acceptable choice under the conditions below, and so is a narrow interface; neither is required.
- A process-wide lookup (a module-level `bind…`/`find…`/`get…()` singleton, a global registry, a service locator) or a collaborator connected after construction is an acceptable choice when all of these hold:
  - startup order guarantees that nothing uses it before it is set;
  - a missing collaborator fails loudly, never silently;
  - it does not hide a cycle that tangles ownership.

  Otherwise pass the collaborator in.
- A required collaborator that is missing is a construction or startup error, or a loud failure where it is used. Code never checks whether an owner exists yet and then quietly does nothing or falls back (`find…()?.do() ?? fallback`): that is behavior decided by absence (Principle 13).
- Exception: read-only values fixed before startup, such as configuration, a logger, or a clock, may be read process-wide. An owner with state or behavior is not such a value, however widely it is used. When a framework creates objects itself and offers only a global container, prefer reading the container in one adapter at the framework's edge and passing what it returns to the owners: that keeps the framework coupling in one place.
- A design that adds or keeps a lookup, or connects a needed collaborator after construction, where the choice is not obvious, records it as a fired Structural Trigger with why the three conditions hold, and the reviewers judge that reason. "The composition binds it at startup" only describes the lookup; the reason says why nothing can use it earlier and how a missing one fails.
- In code a change touches, prefer passing a new dependency in, even where nearby code still uses lookups. An older lookup the change only uses stays as it is; one that causes one of the three problems is a follow-up ([ticket-scope.md](ticket-scope.md#recording-follow-ups)) unless the design decides to fix it now.
- **Where it bends:**
  - A notification listener or callback wired in the composition root after both owners exist is acceptable: the wiring is visible there, and the emitter behaves the same with or without a listener.
  - A setter or closure that supplies a needed collaborator after construction is judged by the three conditions above, not by its form: when startup guarantees the order and a missing one throws, it is a legitimate choice.
- See Examples 9, 10 and 11 in the team's design examples.
- **Signals:** a module-level `bind…`, `set…Instance`, `find…` or `get…()` that hands out an owner; a use that can run before a setter or binding does; `?.` on a looked-up owner followed by `?? fallback` or nothing; a comment explaining that X is bound before or after Y; tests that bind, reset or replace a global to swap in a fake; a design that lists a process binding, global registry or service locator as a facade or boundary, or approves one without the reasons the three conditions need.
- **Check:** How does each owner the change adds or touches get each collaborator it needs, and where is the order in which owners are created visible? For each lookup or after-construction connection the change adds or uses: can anything use it before it is set, does a missing one fail loudly, and does it hide a cycle that tangles ownership?

## Practical Application Guide

Design in this order. Each step applies the principle it names; the design spec's section fill order records the result.

1. Read the current code path and establish the behavioral baseline (Principle 1); confirm the supported scenario basis (Principle 6).
2. Build the spine inventory and write each primary spine (Principle 2).
3. Name the main-line nodes in the project's vocabulary (Principle 15) and define what each owns (Principle 3); attach off-spine concerns to their owner, reusing existing capability areas first (Principle 4).
4. Decide boundaries, dependency direction, and interfaces (Principles 3, 9, 10), including what each dependency that points back against the spine really needs (Principle 9), and how each owner receives its collaborators from the composition root (Principle 16).
5. Draft file responsibilities, then extract reusable owned structures where repetition appears and tighten them (Principle 11), re-tighten the file responsibilities, and only then finalize folder and path mapping (Principle 12).
6. List what the target makes unnecessary and the dead code in the touched files (Principles 7, 8); make each persisted-data transition decision (Principle 5).
7. Record the change inventory and sequence, and add short examples where a shape would stay abstract (Principle 14).

## Structural Triggers

When a trigger fires, apply the principle it names and record in the design spec which triggers fired, with evidence, and the response: the structure the principle asks for, or a deviation with its reason ([The Approach](#the-approach-spine-first-practices-in-context)).

| Trigger | Fires when | Principle |
| --- | --- | --- |
| Repeated coordination | selection, fallback, retry, aggregation, routing, or fan-out logic repeats across callers | 13 |
| Responsibility overload | one file owns several unrelated concerns, or a grouping becomes a catch-all | 12 |
| Ambiguous boundary | a method takes a generic ID or selector for different subjects, or returns a mixed-subject list | 10 |
| Empty indirection | a layer only forwards calls, or the design adds an interface, port, adapter or wrapper (judge it with the empty indirection check) | 13 |
| Authoritative boundary | a caller depends on both an outer boundary and one of its internals | 3 |
| Shared folder | code lands in a shared or common folder without being truly cross-cutting | 11 |
| Shared-structure tightness | a proposed shared type still has redundant fields or overlapping representations | 11 |
| Shared-base overreach | a base type accumulates optional fields to serve divergent cases | 11 |
| Capability-area reuse | the spine needs status, events, handlers, persistence, streaming, bootstrap, shutdown, or similar off-spine behavior | 4 |
| Legacy cleanup | a solution keeps wrappers, dual paths, or fallbacks only for old behavior | 8 |
| Persisted-data transition | a code model, serialization contract, or storage schema changes | 5 |
| Example clarity | a design point would stay abstract or easy to misread | 14 |
| Several kinds or forms | a mechanism serves several kinds of subject or entry forms, or two paths serve one capability | 1 |
| Split sequence | a mechanism gets a function that reaches another collaborator, an owner reads "A + B", or rules branch on the side a component runs on | 2, 13 |
| Derived data | a fact is computed in two places, or a changed structure feeds views, sets, validators, or streams | 11 |
| Behavior by absence | a required behavior follows from a failed lookup, a missing event, or "counts as" | 13 |
| Vocabulary drift | a domain word gets a second meaning, a concept a second name, or a name says less or more than the thing does | 15 |
| Hidden dependency | code reaches an owner through a process-wide binding, registry, or `get…()` singleton, or connects a collaborator the owner needs after construction, instead of receiving it; or a design lists such a binding as a boundary (a notification listener does not fire it) | 16 |
| Backward dependency | two owners need each other, or a dependency points back against the spine | 9 |

## Task Design Health Assessment

Every task needs an explicit design-health decision, regardless of size or posture.
The assessment can be short for a narrow local fix, but it must be supported by current-state evidence rather than generic reassurance.

Use the assessment to answer:

- Is this task a feature request, bug fix, behavior change, refactor, cleanup, performance issue, or larger requirement?
- Is the right response a local change, or does the task expose a design issue?
- If a bug is reported, is the root cause a local defect, a missing invariant, a boundary/ownership problem, duplicated policy, or a data-model/API shape issue?
- If a feature is requested, can the existing ownership model absorb it cleanly, or would direct addition make the product less maintainable?
- Is refactoring required in this change, explicitly not needed, or deferred with a named residual risk?

Root-cause classifications:

- `Local Implementation Defect`: the existing owner and boundary are correct; one local branch, condition, conversion, or state update is wrong.
- `Missing Invariant`: the right owner exists but does not enforce a required rule consistently.
- `Boundary Or Ownership Issue`: the task crosses, bypasses, or confuses authoritative ownership (Principle 3).
- `Duplicated Policy Or Coordination`: fallback, retry, aggregation, routing, fan-out, validation, or selection logic repeats across callers and needs one owner (Principle 13).
- `File Placement Or Responsibility Drift`: the change would expand a file or folder beyond its real concern (Principle 12).
- `Shared Structure Looseness`: shared DTOs, schemas, types, mappers, or normalizers are redundant, overlapping, or too generic (Principle 11).
- `Legacy Or Compatibility Pressure`: the proposed answer keeps old paths, dual behavior, wrappers, or fallback branches that should be removed (Principle 8).
- `No Design Issue Found`: the current design remains healthy for this scope; explain why.

Decision examples:

- Local bug with no refactor:
  - `Change posture`: bug fix
  - `Root cause classification`: local implementation defect
  - `Refactor needed now`: no
  - `Why`: the existing owner and boundary are correct; the defect is isolated to one validation branch and does not duplicate policy or bypass a boundary.
- Bug that exposes a boundary problem:
  - `Change posture`: bug fix
  - `Root cause classification`: boundary or ownership issue
  - `Refactor needed now`: yes
  - `Why`: callers depend on both an outer service and one of its repositories, causing inconsistent invariant enforcement.
  - `Design response`: strengthen the authoritative service boundary and remove direct repository access from those callers.
- Feature that should reuse an existing subsystem:
  - `Change posture`: feature
  - `Root cause classification`: no design issue found
  - `Refactor needed now`: no
  - `Why`: the existing subsystem already owns the off-spine concern; the feature extends that owner without changing dependency direction.
- Feature that requires refactor first:
  - `Change posture`: feature
  - `Root cause classification`: file placement or responsibility drift
  - `Refactor needed now`: yes
  - `Why`: adding the feature directly would grow an already mixed file that owns unrelated parsing, persistence, and orchestration.
  - `Design response`: split file responsibilities by owner first, then add the feature under the correct owner.
- Compatibility pressure:
  - `Change posture`: behavior change
  - `Root cause classification`: legacy or compatibility pressure
  - `Refactor needed now`: yes
  - `Why`: preserving old and new behavior through a dual-path branch would keep two representations authoritative.
  - `Design response`: make a clean-cut replacement and record the old path removal in scope.

## Task Size And Architectural Risk

The Solution Designer classifies every completed design with these two fields
and records the evidence in the design spec, including for a narrow local
change. The reviewers check the same classification.

- `task_size`: `Small`, `Medium`, or `Large`.
  - `Small`: a narrow local change with limited implementation scope.
  - `Medium`: several files or components within existing ownership and
    architectural boundaries.
  - `Large`: a broad feature, major refactor, or change spanning substantial
    implementation scope or multiple subsystems.
- `architectural_risk`: `Low` or `High`.
  - `Low`: the current architecture absorbs the change with bounded impact,
    low uncertainty, and no material new or changed contract, persistence,
    security, concurrency, deployment, or ownership-boundary behavior.
  - `High`: any material contract, persistence, security, concurrency,
    deployment, ownership-boundary, blast-radius, or unresolved-uncertainty
    impact is present.

### Content-Heavy Work Classification Guardrail

Separate **content volume** from **code-architecture impact** before assigning
these fields. A large number of Markdown/JSON/content packages, source files,
catalog entries, generated records, or schema conversions does not by itself
make work `Large` or `High`. Classify the implementation surface and production
path, not the number of content records.

When the bounded delta is a deterministic content/projection conversion plus
catalog, generator, verifier, focused test, or documentation updates within
existing ownership and contracts, it is normally `Small` or `Medium` with
`architectural_risk=Low`, even when the content inventory is large. Confirm
that the existing readers/contracts can consume the result and that no new
runtime owner, API, persistence migration, route behavior, security boundary,
concurrency behavior, deployment concern, or normative availability/scoring
semantics is introduced.

Use `Large` or `High` only when the implementation itself materially changes
code architecture or another listed risk surface—for example, introducing or
moving runtime owners, changing shared contracts, migrating learner state,
rewiring routes/APIs, removing duplicate readers, or reconciling multiple
subsystems. Do not inflate risk merely because the current repository contains
legacy architecture that is explicitly out of scope for the requested delta.
Conversely, a small amount of content can still be `High` when its integration
changes a shared contract or persistence/ownership boundary.

Record the distinction explicitly in `design-spec.md`: list content inventory
as evidence, then separately list the code/runtime/persistence surfaces actually
in scope. If implementation discovers that a content-only change requires
material architecture changes, return a Design Impact and reclassify rather
than broadening the direct route silently.

Use this structural-versus-payload check when classifying the completed design:

1. **Payload surfaces:** content packages, Markdown/JSON bodies, catalogs,
   fixtures, generated indexes, provenance, and content-only documentation.
2. **Structural surfaces:** runtime modules, shared types/interfaces, ownership
   boundaries, dependency direction, routes/APIs, persistence readers/writers,
   migrations, security/concurrency controls, and deployment configuration.
3. **House test:** if the existing structural surfaces can consume the changed
   payload through their current contract and no structural surface changes
   meaningfully, do not inflate size or risk solely because the payload
   inventory is large.
4. **Target-versus-delta test:** distinguish the architecture the requirements
   describe as a long-term target from the code and payload surfaces actually
   requested in this implementation round. Do not turn an entire repository
   inventory or a future clean-cut target into current implementation scope
   without evidence that those structural changes are part of the delta.

Typical sizing examples: one content package or local validation adjustment is
usually `Small`; a bulk package conversion with catalog/generator/verifier,
test, and documentation updates but no runtime-owner change is usually
`Medium`/`Low`; a runtime-boundary refactor, shared-contract change, route/API
rewrite, or persistence migration is `Large` and/or `High`.

Record the values, rationale and affected surfaces in the design spec. If later
evidence changes the classification, update the design artifact and classify
the revised result rather than silently downgrading risk. The classification
informs routing; the team's handoff rules choose the recipients.

## Common Local Patterns

Use these only when they solve a local problem inside a clear owner or off-spine concern.
These patterns are secondary to the primary execution/data-flow spine and ownership model.
Do not introduce a pattern if it obscures the spine, blurs ownership, or creates generic coordination blobs. For a repository or a manager, callers above the owning boundary still depend only on that boundary (Principle 3).

### State Machine

- Solves: lifecycle-driven behavior with explicit states and transitions.
- Best fit: inside one owned node with meaningful state progression.
- Avoid: spreading one state machine across multiple owners without a clear boundary.

### Event Loop / Worker Loop

- Solves: continuous dispatch, polling, or async work handling.
- Best fit: inside one owned runtime or worker-style node.
- Avoid: letting the loop become the whole architecture instead of the internal mechanism of one owner.
- Example shape: `JobRuntime -> JobWorker`, where the runtime owns lifecycle and the worker owns the serialized event loop.

### Factory

- Solves: controlled construction of objects, backends, adapters, or runtime variants.
- Best fit: boundary creation points with explicit ownership.
- Avoid: turning a factory into a service locator that code asks for owners at runtime without Principle 16's conditions, or into a policy container.
- Example shape: `AgentFactory` creates runtime/context/handler-registry wiring at the creation boundary instead of scattering construction across runtime code.

### Registry

- Solves: lookup of capabilities, handlers, providers, or definitions by key.
- Best fit: off-spine concern for indexed lookup.
- Avoid: hiding business decisions or orchestration inside the registry. By default the registry itself is passed to the owner that uses it; a process-wide registry where code looks up owners needs Principle 16's conditions.
- Example shape: `EventHandlerRegistry` or a parser strategy registry stays as lookup infrastructure for a dispatcher or parser owner.

### Adapter

- Solves: translation between external and internal contracts.
- Best fit: boundaries around providers, transport layers, persistence, or external callbacks.
- Avoid: embedding core business behavior into boundary translation code.
- Example shape: event bridges or callback binders translate between member/runtime events and outward-facing team or transport events.

### Strategy

- Solves: interchangeable behavior variants behind one stable contract.
- Best fit: one owner that selects among explicit variants.
- Avoid: using strategy when the variants actually represent different owners or flows.
- Example shape: a streaming parser builds detection/parsing strategies from a small registry while one parser owner remains in control.

### Repository

- Solves: persistence access behind a stable domain-facing contract.
- Best fit: persistence boundary serving a clear owner.
- Avoid: placing orchestration, validation, or business rules in the repository.
- Example shape: repository fulfills storage for a domain/use-case owner; it should not become a hidden coordinator.

### Manager

- Solves: explicit coordination only when authority and lifecycle ownership are clear.
- Best fit: top-level orchestration with narrow, well-defined ownership.
- Avoid: vague coordination blobs that accumulate unrelated responsibilities.
- Example shape: `PipelineManager` owns lazy step creation, step startup, and pipeline-level routing, while runtime loops and handlers stay elsewhere.
