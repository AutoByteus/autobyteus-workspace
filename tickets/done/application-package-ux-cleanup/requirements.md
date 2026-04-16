# Requirements Doc

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Create a post-merge follow-on ticket that cleans up two product UX/design areas that are currently causing user confusion:

1. **Settings → Application Packages trust/presentation UX**
2. **Definition-level default launch preferences UX for agents and agent teams**

The first issue is that the current Application Packages screen always exposes a reserved built-in applications row, even when it contains zero applications, and it reveals the raw built-in filesystem path. In local/personal builds that path can look like a personal repo/worktree path; in installed builds it would look like an app-bundle/resources path. That presentation is confusing and can make users think the product is reading applications from arbitrary local folders even when no built-in apps are actually present.

The second issue is that the current **Default launch settings** UX is modeled and placed poorly. The concept is actually a general definition-level launch-preference capability, not an application-only concern. Users defining agents — and, by extension, agent teams — should be able to optionally express preferred runtime, model identifier, and LLM config defaults that are later used when the definition is launched directly or through higher-level surfaces. The current agent editor uses raw text inputs and raw JSON editing, places the section too prominently, and does not match the much better runtime/model/config UX already used by the direct run configuration forms.

This follow-on slice must therefore clarify the product model for:
- built-in platform-owned application sources,
- imported local/GitHub application packages,
- zero-built-in-app states,
- path/source visibility,
- built-in application materialization into app-managed storage under server-data, and
- which storage/location details are normal-user-facing versus debug-only,
- definition-level launch-preference ownership for agents and teams,
- correct placement/optionality of launch preferences in definition editors, and
- reuse of the existing runtime/model/config UX patterns instead of free-text fields.

## Investigation Findings

- The current backend `ApplicationPackageService.listApplicationPackages()` always prepends one built-in package entry via `mapBuiltInPackage(...)`, regardless of whether the built-in root actually contains any applications.
- The current built-in package entry exposes both `path` and `source` as the resolved built-in root path.
- The current UI (`ApplicationPackagesManager.vue`) renders the raw `pkg.path` for every non-GitHub row, including the built-in row.
- The current UI also renders `Built-in | Applications: 0` when the built-in root exists but is empty.
- The built-in root is currently resolved by upward scan from the server app root to the nearest ancestor containing an `applications/` directory, so in local/personal builds the raw path can resemble a developer repo/worktree path.
- GitHub-installed application packages are materially different from built-ins today: they are installed into app-managed storage under the app data directory, while linked local packages stay in place and built-ins remain platform-owned bundle resources.
- `AppConfig` already exposes `getAppDataDir()`, and built-in shared agents/teams already live under server-data-managed directories (`agents/`, `agent-teams/`), which strengthens the case for moving built-in applications into a managed server-data location too.
- Existing tests currently encode the always-show-built-in-row behavior, so this UX cleanup will require explicit requirement/design-driven test changes rather than only wording tweaks.
- Agent definitions already support `defaultLaunchConfig` in the domain, provider config, backend service, GraphQL converter, frontend store, and application launch-preparation logic.
- The current agent-definition editor component `AgentDefaultLaunchConfigFields.vue` uses free-text runtime/model inputs plus a raw JSON textarea, which is materially worse than the runtime/model/config UX already used by `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue`.
- The current agent-definition form places launch defaults above skills/tools, which makes an optional advanced preference look too primary.
- Team definitions currently do **not** expose an equivalent definition-level `defaultLaunchConfig` shape in the team definition store/domain/API surface.
- The current codebase already treats application-owned team definitions as first-class `AgentTeamDefinition` subjects loaded through `application-owned-team-source.ts` and `file-agent-team-definition-provider.ts`, and application launch currently consumes them.
- `application-owned-team-source.ts` currently owns a separate application-owned team config parser/write contract that omits `defaultLaunchConfig`, even though application-owned agent definitions already carry `defaultLaunchConfig`.
- The run-configuration domain already has the right general concepts (`runtimeKind`, `llmModelIdentifier`, `llmConfig`) for both agent and team runs, which means the design problem is not whether the concept is valid; it is how to make the definition-level preference model and UX consistent and intentional.

## Recommendations

- Treat built-in applications as a platform-owned logical source in the product model, not as a raw filesystem root in the default Settings UI.
- Hide empty built-in sources entirely in the normal Application Packages list.
- When built-in applications do exist, present them with a generic platform-owned label such as `Platform Applications` instead of a raw path-based row.
- Keep raw built-in filesystem paths out of the normal settings surface; if still needed, move them to an explicit developer/details/debug affordance.
- Move built-in applications into a platform-managed application package root under server-data instead of resolving them from an upward-scanned repo/bundle path. The likely target is a managed root such as `AppDataDir/application-packages/platform/` containing `applications/<application-id>/...`.
- Treat this as runtime materialization/synchronization, not literal build-time writing into `server-data`: packaged resources can still ship inside the app bundle, but the platform should copy/sync them into the managed built-in package root on first run or upgrade.
- Differentiate source presentation by source kind:
  - built-in platform-owned source: friendly platform label, no raw path by default,
  - linked local package: user-visible local path remains acceptable because the user chose it,
  - GitHub-installed package: show repository identity as primary and treat managed install path as internal/debug-only.
- Treat definition-level launch defaults as a **general launch-preference capability** for reusable definitions, not as an application-only feature.
- Keep the stored contract aligned with the existing `defaultLaunchConfig` shape, but make the user-facing meaning more clearly “preferred launch settings” or equivalent optional defaults.
- Replace the raw text/JSON launch-default editor UX with the same runtime selection, model selection, and schema-driven model-config editing patterns already used by the run configuration forms.
- Add equivalent team-definition-level launch preferences for `runtimeKind`, `llmModelIdentifier`, and `llmConfig`.
- Extend the same team-level launch-preference contract to application-owned team definitions through their existing source/parser/write path instead of scoping them out or preserving an application-launch fallback.
- Keep definition-level launch preferences optional and secondary in the editor information architecture; they should appear below the more primary authoring concerns such as skills/tools and may be collapsed under an optional/advanced section.
- Treat the definition boundary — not the application boundary — as the authoritative owner for these stored defaults.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- User opens Settings → Application Packages when there are zero built-in applications and zero imported packages.
- User opens Settings → Application Packages when there are imported packages but no built-in applications.
- User opens Settings → Application Packages when there are one or more built-in platform applications.
- User reviews a linked local application package root.
- User reviews a GitHub-installed application package.
- Developer/debug user intentionally opens deeper details to inspect internal package-source/location metadata.
- User edits an agent definition and optionally sets preferred runtime, model identifier, and LLM config defaults.
- User edits an agent definition and leaves launch preferences entirely empty.
- User edits an agent team definition and optionally sets preferred runtime, model identifier, and LLM config defaults.
- User edits an application-owned agent team definition from a writable application package and optionally sets preferred runtime, model identifier, and LLM config defaults.
- User later launches an agent directly and sees those definition-level preferences prefilled in the run flow.
- User later launches an agent team directly and sees those team-definition-level preferences prefilled in the run flow.
- User later launches an application-owned agent team through an application flow and sees those team-definition-level preferences prefilled in the run flow.
- Application flows that already derive agent launch behavior from `defaultLaunchConfig` continue to work, but the concept is presented as a general definition capability rather than something owned by applications.

## Out of Scope

- Redesigning the full application import workflow.
- Changing application bundle validation rules.
- Reworking application launch/session UX outside package-source presentation.
- Redesigning every run configuration surface from scratch; this slice should reuse and align with the existing good runtime/model/config interaction patterns.
- Adding team-member-level default override authoring to team definitions unless later investigation proves it is required for this slice.
- Changing actual runtime execution semantics beyond how stored definition-level defaults are expressed and consumed.

## Functional Requirements

- `REQ-001`: The Application Packages product model shall distinguish platform-owned built-in application sources from imported application packages, instead of presenting all sources as equivalent filesystem roots.
- `REQ-002`: The design shall define the zero-built-in-application case explicitly and shall prevent the default UI from showing an alarming or confusing built-in row that reads as `Built-in | Applications: 0`.
- `REQ-003`: The normal Settings → Application Packages surface shall not expose the raw built-in filesystem path by default.
- `REQ-004`: The design shall explicitly classify which package-source/location fields are normal-user-facing, secondary details, or developer/debug-only.
- `REQ-005`: When built-in applications exist, the normal UI shall present them as a platform-owned source using user-friendly naming rather than raw path identity.
- `REQ-006`: The design shall decide whether empty built-in sources are hidden entirely or represented only through an explicit empty-state message; the resulting UX shall avoid implying that the platform is reading apps from arbitrary user folders.
- `REQ-007`: The design shall differentiate default source presentation rules between built-in platform apps, linked local package roots, and GitHub-installed packages.
- `REQ-008`: The design shall intentionally move built-in platform applications out of upward-scanned repo/bundle roots and into a platform-managed application package root under server-data, and shall define the materialization/synchronization model that achieves that.
- `REQ-009`: The authoritative higher-layer owner for package-source presentation rules shall remain the application-package boundary (`ApplicationPackageService` plus application-package UI), not an ad hoc component-only formatting patch.
- `REQ-010`: Any backend/API contract changes needed for safer package-source presentation shall be designed intentionally rather than leaking raw path/source fields to the UI by default.
- `REQ-011`: The settings empty state for application packages shall feel product-safe and truthful when there are no built-in apps and no imported packages.
- `REQ-012`: The resulting UX shall preserve user trust by making it clear which package sources are platform-owned versus user-imported.
- `REQ-012A`: The built-in application package location decision shall align with the wider server-data mental model already used by built-in agents and built-in teams.
- `REQ-013`: Definition-level launch defaults shall be treated as a general reusable-definition capability, not as an application-only feature.
- `REQ-014`: Agent definitions shall support optional preferred launch settings for `runtimeKind`, `llmModelIdentifier`, and `llmConfig` through a user-friendly editor flow.
- `REQ-015`: Shared and application-owned agent team definitions shall support equivalent optional preferred launch settings for `runtimeKind`, `llmModelIdentifier`, and `llmConfig` at the team-definition level.
- `REQ-016`: The authoring UX for definition-level launch preferences shall reuse the same runtime selection, model selection, and schema-driven model-config interaction patterns already used by the direct run configuration forms, instead of raw free-text and raw JSON-only fields.
- `REQ-017`: The definition-editor information architecture shall treat launch preferences as optional secondary configuration and shall place them lower in the form than the primary agent/team authoring concerns.
- `REQ-018`: When no definition-level launch preferences are set, the stored contract shall remain empty/optional and launch behavior shall continue to use the normal default runtime/model behavior without forcing users to fill those fields.
- `REQ-019`: When definition-level launch preferences are set, later direct launch flows and application launch preparation for agents and teams — including application-owned team launches — shall be able to prefill the corresponding run configuration fields from those stored defaults while still allowing launch-time overrides.
- `REQ-020`: The authoritative owner for stored definition-level launch preferences shall be the agent-definition and agent-team-definition boundaries, not application-specific launch helpers.
- `REQ-021`: Team-definition launch-preference support shall be added intentionally across backend/domain/API/store/editor boundaries, including the application-owned team source/parser/write path, rather than simulated only in one frontend component.
- `REQ-022`: The resulting UX shall reduce user confusion by making the launch-preference editor look and behave like the existing run-configuration UX they already understand.

## Acceptance Criteria

- `AC-001`: A reviewer can determine exactly how the UI behaves when the built-in application source exists but contains zero applications.
- `AC-002`: The default Settings UI no longer requires showing a raw built-in filesystem path.
- `AC-003`: The requirements/design explicitly define user-facing naming for built-in application sources when they are shown.
- `AC-004`: The design clearly distinguishes default-visible, details-only, and debug-only package-source metadata.
- `AC-005`: A reviewer can see how presentation differs between built-in platform apps, linked local roots, and GitHub-installed packages.
- `AC-006`: The design clearly states that built-in apps are materialized into a platform-managed server-data package root (instead of remaining an upward-scanned repo/bundle root), and explains the synchronization model.
- `AC-007`: The zero-built-in-app case is represented by an intentional empty-state or hidden-row rule rather than by an awkward `Built-in | Applications: 0` row.
- `AC-008`: The higher-layer ownership of package-source presentation rules is explicit enough that implementation does not devolve into one-off component wording patches.
- `AC-009`: The resulting UX model makes it much less likely that a normal user would conclude the app is reading arbitrary applications from a personal repo/worktree path.
- `AC-010`: A reviewer can see that definition-level launch preferences are explicitly treated as a general agent/team definition capability rather than an application-only concern.
- `AC-011`: The agent-definition launch-preference editor no longer relies on three raw free-text/JSON inputs as the primary interaction model.
- `AC-012`: The team-definition model/API/store/editor design clearly includes optional preferred launch settings for runtime, model, and LLM config for both shared and application-owned team definitions, with the application-owned source/parser/write path covered explicitly.
- `AC-013`: The design makes clear that definition-level launch preferences are optional and that leaving them blank preserves normal launch behavior.
- `AC-014`: The design makes clear that stored definition-level launch preferences prefill later direct-launch and application-launch flows — including application-owned team launches — but do not remove launch-time override capability.
- `AC-015`: The information architecture places launch preferences as a secondary/optional section rather than as a dominant early section in the definition form.
- `AC-016`: A reviewer can see the intended reuse/alignment between definition-level launch-preference editing and the existing run-configuration UI patterns.

## Constraints / Dependencies

- The earlier application-bundle architecture ticket is already merged; this is a post-merge follow-on slice.
- The new ticket must be grounded in the current merged implementation state in this repository.
- The user explicitly asked that built-in applications feel like they live in server-data alongside built-in agents/teams, which changes the earlier storage decision for this ticket.
- The follow-on ticket should use a dedicated worktree/branch and its own canonical ticket artifact folder.
- Existing backend, GraphQL, store, and component tests currently encode the always-show-built-in-row behavior and will need intentional updates if the product model changes.
- Agent-definition `defaultLaunchConfig` already exists in the current domain/API/store model, so the follow-on design should reuse that capability rather than inventing an unrelated parallel shape.
- Team-definition default launch preferences do not yet exist, so that portion of the slice requires explicit contract design and implementation work.
- Application-owned team definitions already exist as first-class `AgentTeamDefinition` subjects with dedicated source/provider code, so the design cannot safely remove old launch behavior without explicitly carrying that path into the new team-level `defaultLaunchConfig` model.

## Assumptions

- Built-in platform apps and imported apps should remain conceptually distinct in product ownership even if some lower-level discovery logic is shared.
- A runtime materialization step from packaged resources into server-data is acceptable if it produces a cleaner long-term product/storage model.
- Users who import a local package root can tolerate seeing that chosen local path in the normal UI more readily than they can tolerate seeing an unexplained built-in internal path.
- GitHub-installed packages should be described primarily by repository identity rather than by the internal managed install path.
- Users understand runtime/model/config selection best when the definition editor uses the same interaction patterns they already see in the launch/run forms.
- Team-definition launch preferences can start with team-level runtime/model/config defaults without immediately expanding into member-level default authoring.

## Risks / Open Questions

- The exact managed built-in root path still needs a final naming choice (`AppDataDir/application-packages/platform` is the leading recommendation because it preserves the package-root contract cleanly).
- If the API continues to expose raw `path`/`source` for every package without a cleaner presentation contract, frontend cleanup may remain fragile and repetitive.
- Hiding the built-in row entirely when empty is probably the clearest product move, but this must be checked against any operator/developer expectation that the platform-owned source should remain discoverable.
- There may be a need for an explicit developer mode or details affordance if support/debug workflows still require raw built-in path visibility.
- The team-definition slice broadens this ticket materially; if implementation sequencing becomes too large, the work may still need phased delivery inside one reviewed design.
- Shared-team and application-owned-team config parsing must stay aligned on the same tight `defaultLaunchConfig` semantics; otherwise team launch behavior will drift by ownership scope.
- There is a naming/UX choice to make between “Default launch settings”, “Preferred launch settings”, and similar language; the stored contract can remain `defaultLaunchConfig` even if the user-facing wording is improved.

## Requirement-To-Use-Case Coverage

- `REQ-001` -> trustworthy product model for built-in vs imported sources
- `REQ-002` -> zero-built-in-app default behavior
- `REQ-003` -> hide raw built-in path from normal UI
- `REQ-004` -> metadata visibility classification
- `REQ-005` -> user-friendly built-in naming when present
- `REQ-006` -> explicit empty built-in source behavior
- `REQ-007` -> source-kind-specific presentation rules
- `REQ-008` -> built-in materialized storage model decision
- `REQ-009` -> higher-layer ownership clarity for package presentation
- `REQ-010` -> intentional API/presentation contract shaping
- `REQ-011` -> safe overall package empty-state UX
- `REQ-012` -> user trust / source ownership clarity
- `REQ-012A` -> server-data alignment for built-in applications
- `REQ-013` -> general launch-preference capability framing
- `REQ-014` -> agent-definition preferred launch settings
- `REQ-015` -> team-definition preferred launch settings across shared and application-owned team definitions
- `REQ-016` -> shared runtime/model/config UX reuse
- `REQ-017` -> lower-priority editor placement / optionality
- `REQ-018` -> empty optional-default behavior
- `REQ-019` -> launch-time prefill plus override behavior across direct and application launch flows
- `REQ-020` -> correct authoritative owner for stored defaults
- `REQ-021` -> full-stack team-definition contract support, including the application-owned team source path
- `REQ-022` -> reduced user confusion through UX alignment

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> zero-built-in-app behavior clarity
- `AC-002` -> built-in path removal from default UI
- `AC-003` -> built-in naming clarity
- `AC-004` -> metadata-tier clarity
- `AC-005` -> source-kind presentation clarity
- `AC-006` -> built-in materialization decision clarity
- `AC-007` -> empty built-in source UX clarity
- `AC-008` -> package presentation ownership/boundary clarity
- `AC-009` -> user-trust outcome clarity
- `AC-010` -> general launch-preference capability clarity
- `AC-011` -> improved agent-definition editing UX
- `AC-012` -> team-definition support clarity across shared and application-owned team definitions
- `AC-013` -> optional defaults behavior clarity
- `AC-014` -> prefill-versus-override launch behavior clarity across direct and application launch flows
- `AC-015` -> editor information architecture clarity
- `AC-016` -> reuse/alignment with existing run-config UX

## Approval Status

Approved by user on 2026-04-16 for the combined follow-on refactor scope, including: (a) application-package UX cleanup, and (b) general agent/team definition launch-preference cleanup aligned with run-config UX.
Refined on 2026-04-16 after architecture review finding `AR-001` to explicitly include application-owned team definitions within the already-approved team-definition launch-preference scope.
